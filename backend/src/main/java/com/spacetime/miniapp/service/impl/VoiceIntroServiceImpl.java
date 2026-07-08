package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVoiceIntroRecordDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVoiceIntroRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.VoiceIntroStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.AudioSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.miniapp.dto.request.VoiceIntroSubmitReq;
import com.spacetime.miniapp.dto.response.VoiceIntroVO;
import com.spacetime.miniapp.service.VoiceIntroService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 移动端语音介绍服务实现。
 *
 * 语音介绍只走音频安全 Provider，不做语音转文字，也不进入开放性文字审核；
 * 只有音频安全通过后的记录才会同步到用户详情并对外展示。
 */
@Service
@RequiredArgsConstructor
public class VoiceIntroServiceImpl implements VoiceIntroService {

    private final AppUserDao appUserDao;
    private final AppUserVoiceIntroRecordDao voiceIntroRecordDao;
    private final ExternalProviderTaskDao externalProviderTaskDao;
    private final AudioSafetyProvider audioSafetyProvider;

    /** 提交语音介绍，完成音频安全审核并同步当前有效语音状态。 */
    @Override
    @Transactional
    public VoiceIntroVO submitVoiceIntro(Long userId, VoiceIntroSubmitReq req) {
        AppUser user = requireUser(userId);
        validateRequest(req);

        AppUserVoiceIntroRecord record = baseRecord(userId, req);
        try {
            ProviderCheckResult result = audioSafetyProvider.check(req.getVoiceUrl(), req.getDuration());
            ExternalProviderTask task = providerTask(userId, "AUDIO_SAFETY", result);
            externalProviderTaskDao.insert(task);
            record.setProviderTaskId(task.getId());
            record.setMachineSignalJson(result.getRawResponseJson());
            record.setAuditTime(LocalDateTime.now());

            if (Boolean.TRUE.equals(result.getSafe())) {
                // 机审通过后立即成为当前有效语音，用户详情才会展示播放入口。
                record.setAuditStatus(VoiceIntroStatusEnum.VOICE_APPROVED.getCode());
                record.setCurrentEffective(true);
                voiceIntroRecordDao.insert(record);
                user.setVoiceIntroUrl(req.getVoiceUrl());
                user.setVoiceIntroDuration(req.getDuration());
                user.setVoiceIntroAuditStatus(VoiceIntroStatusEnum.VOICE_APPROVED.getCode());
                user.setVoiceIntroRecordId(record.getId());
                user.setVoiceIntroRejectReason(null);
                appUserDao.updateById(user);
                return toVo(record, true);
            }

            // 机审拒绝只记录审核结果，不替换当前有效语音。
            record.setAuditStatus(VoiceIntroStatusEnum.VOICE_REJECTED.getCode());
            record.setRejectReason(StrUtil.blankToDefault(result.getRejectReason(), "音频内容安全未通过"));
            record.setCurrentEffective(false);
            voiceIntroRecordDao.insert(record);
            user.setVoiceIntroAuditStatus(VoiceIntroStatusEnum.VOICE_REJECTED.getCode());
            user.setVoiceIntroRecordId(record.getId());
            user.setVoiceIntroRejectReason(record.getRejectReason());
            appUserDao.updateById(user);
            return toVo(record, false);
        } catch (Exception ex) {
            // Provider 异常时进入待审核，避免三方波动导致用户提交链路失败。
            record.setAuditStatus(VoiceIntroStatusEnum.VOICE_PENDING.getCode());
            record.setRejectReason(null);
            record.setCurrentEffective(false);
            voiceIntroRecordDao.insert(record);
            user.setVoiceIntroAuditStatus(VoiceIntroStatusEnum.VOICE_PENDING.getCode());
            user.setVoiceIntroRecordId(record.getId());
            user.setVoiceIntroRejectReason(null);
            appUserDao.updateById(user);
            return toVo(record, false);
        }
    }

    /** 删除当前有效语音介绍，同时清空用户详情里的播放字段。 */
    @Override
    @Transactional
    public void deleteVoiceIntro(Long userId) {
        AppUser user = requireUser(userId);
        AppUserVoiceIntroRecord current = voiceIntroRecordDao.selectOne(new LambdaQueryWrapper<AppUserVoiceIntroRecord>()
                .eq(AppUserVoiceIntroRecord::getUserId, userId)
                .eq(AppUserVoiceIntroRecord::getCurrentEffective, true));
        if (current == null) {
            throw new BusinessException("语音介绍不存在");
        }
        current.setCurrentEffective(false);
        voiceIntroRecordDao.updateById(current);
        user.setVoiceIntroUrl(null);
        user.setVoiceIntroDuration(null);
        user.setVoiceIntroAuditStatus(VoiceIntroStatusEnum.NOT_SUBMITTED.getCode());
        user.setVoiceIntroRecordId(null);
        user.setVoiceIntroRejectReason(null);
        appUserDao.updateById(user);
    }

    /** 查询用户，不存在时直接阻断后续提交。 */
    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    /** 校验语音 URL 和时长，时长口径与移动端对接文档保持一致。 */
    private void validateRequest(VoiceIntroSubmitReq req) {
        if (req == null || StrUtil.isBlank(req.getVoiceUrl())) {
            throw new BusinessException("语音介绍缺少音频 URL");
        }
        if (req.getDuration() == null || req.getDuration() < 10 || req.getDuration() > 60) {
            throw new BusinessException("VOICE_DURATION_INVALID：语音时长必须在10-60秒");
        }
    }

    /** 构造待审核语音记录，审核结果由 Provider 返回后再落状态。 */
    private AppUserVoiceIntroRecord baseRecord(Long userId, VoiceIntroSubmitReq req) {
        AppUserVoiceIntroRecord record = new AppUserVoiceIntroRecord();
        record.setUserId(userId);
        record.setVoiceUrl(req.getVoiceUrl());
        record.setDuration(req.getDuration());
        record.setAuditStatus(VoiceIntroStatusEnum.VOICE_PENDING.getCode());
        record.setSubmitTime(LocalDateTime.now());
        record.setCurrentEffective(false);
        return record;
    }

    /** 记录 Provider 调用结果，供后台审计和三方问题排查。 */
    private ExternalProviderTask providerTask(Long userId, String providerType, ProviderCheckResult result) {
        ExternalProviderTask task = new ExternalProviderTask();
        task.setProviderType(providerType);
        task.setProviderCode(result.getProviderCode());
        task.setUserId(userId);
        task.setResponsePayloadJson(result.getRawResponseJson());
        task.setTaskStatus(Boolean.TRUE.equals(result.getSafe()) ? "SUCCESS" : "REJECTED");
        task.setMocked(Boolean.TRUE.equals(result.getMocked()) ? 1 : 0);
        task.setErrorMessage(result.getRejectReason());
        return task;
    }

    /** 转换为移动端响应，未通过审核时不返回可播放地址。 */
    private VoiceIntroVO toVo(AppUserVoiceIntroRecord record, boolean exposeVoiceUrl) {
        VoiceIntroVO vo = new VoiceIntroVO();
        vo.setVoiceIntroUrl(exposeVoiceUrl ? record.getVoiceUrl() : null);
        vo.setVoiceIntroDuration(record.getDuration());
        vo.setVoiceIntroAuditStatus(record.getAuditStatus());
        vo.setVoiceIntroRejectReason(record.getRejectReason());
        vo.setVisibleToPublic(exposeVoiceUrl);
        return vo;
    }
}

package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.AudioSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.miniapp.dto.request.VoiceIntroSubmitReq;
import com.spacetime.miniapp.dto.response.VoiceIntroVO;
import com.spacetime.miniapp.service.VoiceIntroService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 移动端语音介绍服务实现。
 * 语音介绍只走音频安全 Provider，统一写入 app_user_audit_record，不再使用语音分表。
 */
@Service
@RequiredArgsConstructor
public class VoiceIntroServiceImpl implements VoiceIntroService {

    private final AppUserDao appUserDao;
    private final ExternalProviderTaskDao externalProviderTaskDao;
    private final AudioSafetyProvider audioSafetyProvider;
    private final AppUserAuditService auditService;

    /** 提交语音介绍；机审通过前旧语音继续生效，新语音不对外展示。 */
    @Override
    @Transactional
    public VoiceIntroVO submitVoiceIntro(Long userId, VoiceIntroSubmitReq req) {
        requireUser(userId);
        validateRequest(req);

        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(AppUserAuditTypeEnum.VOICE_INTRO.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setMediaUrl(req.getVoiceUrl());
        record.setDuration(req.getDuration());
        auditService.submit(record);

        try {
            ProviderCheckResult result = audioSafetyProvider.check(req.getVoiceUrl(), req.getDuration());
            ExternalProviderTask task = providerTask(userId, "AUDIO_SAFETY", result);
            externalProviderTaskDao.insert(task);
            if (Boolean.TRUE.equals(result.getSafe())) {
                auditService.machineApprove(record.getId(), task.getId(), result.getRawResponseJson());
                AppUserAuditRecord approved = auditService.latestRecord(userId, AppUserAuditTypeEnum.VOICE_INTRO);
                return toVo(approved, true);
            }
            String reason = StrUtil.blankToDefault(result.getRejectReason(), "音频内容安全未通过");
            auditService.machineReject(record.getId(), task.getId(), result.getRawResponseJson(), reason);
            return toVo(auditService.latestRecord(userId, AppUserAuditTypeEnum.VOICE_INTRO), false);
        } catch (Exception ex) {
            // Provider 异常时保留 PENDING，后台和后续任务可继续处理；不替换旧有效语音。
            return toVo(record, false);
        }
    }

    /** 删除当前有效语音介绍，当前记录失效后不自动回退旧语音。 */
    @Override
    @Transactional
    public void deleteVoiceIntro(Long userId) {
        requireUser(userId);
        AppUserAuditRecord current = auditService.latestEffectiveRecord(userId, AppUserAuditTypeEnum.VOICE_INTRO);
        if (current == null) {
            throw new BusinessException("语音介绍不存在");
        }
        auditService.systemExpire(current.getId(), "用户删除语音介绍");
    }

    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    private void validateRequest(VoiceIntroSubmitReq req) {
        if (req == null || StrUtil.isBlank(req.getVoiceUrl())) {
            throw new BusinessException("语音介绍缺少音频 URL");
        }
        if (req.getDuration() == null || req.getDuration() < 10 || req.getDuration() > 60) {
            throw new BusinessException("VOICE_DURATION_INVALID：语音时长必须在10-60秒");
        }
    }

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

    private VoiceIntroVO toVo(AppUserAuditRecord record, boolean exposeVoiceUrl) {
        VoiceIntroVO vo = new VoiceIntroVO();
        vo.setVoiceIntroUrl(exposeVoiceUrl ? record.getMediaUrl() : null);
        vo.setVoiceIntroDuration(record.getDuration());
        vo.setVoiceIntroAuditStatus(record.getStatus());
        vo.setVoiceIntroRejectReason(record.getRejectReason());
        vo.setVisibleToPublic(exposeVoiceUrl);
        return vo;
    }

}

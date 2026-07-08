package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.dao.AppUserOpenTextAuditDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUserOpenTextAudit;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.enums.ModerationStatusEnum;
import com.spacetime.common.enums.OpenTextFieldEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import com.spacetime.miniapp.dto.request.OpenTextSubmitReq;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;
import com.spacetime.miniapp.service.OpenTextAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;

/**
 * 开放性文字审核服务实现。
 *
 * 关于我、希望 TA 了解、资料问答等自由输入文本会进入机审；
 * 语音介绍不进入这里，语音只走音频安全 Provider，不做语音转文字。
 */
@Service
@RequiredArgsConstructor
public class OpenTextAuditServiceImpl implements OpenTextAuditService {

    private final AppUserOpenTextAuditDao openTextAuditDao;
    private final ExternalProviderTaskDao externalProviderTaskDao;
    private final TextSafetyProvider textSafetyProvider;

    /** 提交开放性文字并记录机审任务。 */
    @Override
    @Transactional
    public OpenTextAuditVO submitOpenText(Long userId, OpenTextSubmitReq req) {
        validate(req);

        ProviderCheckResult result = textSafetyProvider.check(req.getFieldName(), req.getContentText());
        ExternalProviderTask task = providerTask(userId, result);
        externalProviderTaskDao.insert(task);

        AppUserOpenTextAudit record = new AppUserOpenTextAudit();
        record.setUserId(userId);
        record.setFieldName(req.getFieldName());
        record.setContentText(req.getContentText());
        // hash 用于后续去重和对账，不改变原文存储口径。
        record.setContentHash(sha256(req.getContentText()));
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setProviderTaskId(task.getId());
        record.setMachineSignalJson(result.getRawResponseJson());
        record.setSubmitTime(LocalDateTime.now());
        record.setAuditTime(LocalDateTime.now());
        record.setCurrentEffective(Boolean.TRUE.equals(result.getSafe()));
        record.setAuditStatus(Boolean.TRUE.equals(result.getSafe())
                ? ModerationStatusEnum.APPROVED.getCode()
                : ModerationStatusEnum.REJECTED.getCode());
        record.setRejectReason(result.getRejectReason());
        openTextAuditDao.insert(record);
        return toVo(record);
    }

    /** 校验字段类型和文本长度。 */
    private void validate(OpenTextSubmitReq req) {
        if (req == null || OpenTextFieldEnum.getByCode(req.getFieldName()) == null) {
            throw new BusinessException("不支持的开放性文字字段");
        }
        if (StrUtil.isBlank(req.getContentText()) || req.getContentText().length() < 2 || req.getContentText().length() > 500) {
            throw new BusinessException("开放性文字长度不符合要求");
        }
    }

    /** 记录 Provider 调用结果，方便后台审计和问题排查。 */
    private ExternalProviderTask providerTask(Long userId, ProviderCheckResult result) {
        ExternalProviderTask task = new ExternalProviderTask();
        task.setProviderType("TEXT_SAFETY");
        task.setProviderCode(result.getProviderCode());
        task.setUserId(userId);
        task.setResponsePayloadJson(result.getRawResponseJson());
        task.setTaskStatus(Boolean.TRUE.equals(result.getSafe()) ? "SUCCESS" : "REJECTED");
        task.setMocked(Boolean.TRUE.equals(result.getMocked()) ? 1 : 0);
        task.setErrorMessage(result.getRejectReason());
        return task;
    }

    private OpenTextAuditVO toVo(AppUserOpenTextAudit record) {
        OpenTextAuditVO vo = new OpenTextAuditVO();
        vo.setFieldName(record.getFieldName());
        vo.setAuditStatus(record.getAuditStatus());
        vo.setAuditSource(record.getAuditSource());
        vo.setRejectReason(record.getRejectReason());
        return vo;
    }

    /** 生成内容 hash，用于重复提交识别和审计对账。 */
    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("当前运行环境不支持 SHA-256", e);
        }
    }
}

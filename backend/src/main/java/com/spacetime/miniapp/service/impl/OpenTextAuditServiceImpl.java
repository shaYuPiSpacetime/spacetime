package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.enums.OpenTextFieldEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.miniapp.dto.request.OpenTextSubmitReq;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;
import com.spacetime.miniapp.service.OpenTextAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * 开放性文字审核服务实现。
 * 开放文字统一写入 app_user_audit_record；语音介绍不进入这里。
 */
@Service
@RequiredArgsConstructor
public class OpenTextAuditServiceImpl implements OpenTextAuditService {

    private final ExternalProviderTaskDao externalProviderTaskDao;
    private final TextSafetyProvider textSafetyProvider;
    private final AppUserAuditService auditService;

    /** 提交开放性文字并执行文本安全机审。 */
    @Override
    @Transactional
    public OpenTextAuditVO submitOpenText(Long userId, OpenTextSubmitReq req) {
        OpenTextFieldEnum field = validate(req);
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(field.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setContentText(req.getContentText());
        record.setContentHash(sha256(req.getContentText()));
        auditService.submit(record);

        try {
            ProviderCheckResult result = textSafetyProvider.check(req.getFieldName(), req.getContentText());
            ExternalProviderTask task = providerTask(userId, result);
            externalProviderTaskDao.insert(task);
            if (Boolean.TRUE.equals(result.getSafe())) {
                auditService.machineApprove(record.getId(), task.getId(), result.getRawResponseJson());
            } else {
                auditService.machineReject(record.getId(), task.getId(), result.getRawResponseJson(),
                        StrUtil.blankToDefault(result.getRejectReason(), "文本内容安全未通过"));
            }
        } catch (Exception ignored) {
            // Provider 异常时保留 PENDING，后台可继续人工处理。
        }
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.getByCode(field.getCode()));
        return toVo(latest);
    }

    private OpenTextFieldEnum validate(OpenTextSubmitReq req) {
        if (req == null || OpenTextFieldEnum.getByCode(req.getFieldName()) == null) {
            throw new BusinessException("不支持的开放性文字字段");
        }
        if (StrUtil.isBlank(req.getContentText()) || req.getContentText().length() < 2 || req.getContentText().length() > 500) {
            throw new BusinessException("开放性文字长度不符合要求");
        }
        return OpenTextFieldEnum.getByCode(req.getFieldName());
    }

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

    private OpenTextAuditVO toVo(AppUserAuditRecord record) {
        OpenTextAuditVO vo = new OpenTextAuditVO();
        vo.setFieldName(record.getAuditType());
        vo.setAuditStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        vo.setRejectReason(record.getRejectReason());
        return vo;
    }

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

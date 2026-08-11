package com.spacetime.admin.service;

/** 敏感正文访问审计，开始和结束各自独立提交。 */
public interface MessageSensitiveAccessAuditService {
    String begin(SensitiveAccessAuditCommand command);

    void complete(String accessNo, String result, String denyReasonCode);
}

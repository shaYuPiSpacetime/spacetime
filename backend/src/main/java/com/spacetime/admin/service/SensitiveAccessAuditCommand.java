package com.spacetime.admin.service;

/** 敏感正文访问审计命令，不承载正文。 */
public record SensitiveAccessAuditCommand(
        String contextType,
        String contextNo,
        String targetType,
        String targetBizNo,
        String viewReason,
        String requestId) {
}

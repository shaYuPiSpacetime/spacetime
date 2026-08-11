package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 将账号受限事实转换为平台安全系统消息。 */
public interface AccountStatusMessageNotificationService {
    void publishAfterCommit(Long userId, String accountStatus, LocalDateTime changedAt);

    boolean publishNow(Long userId, String accountStatus, LocalDateTime changedAt);
}

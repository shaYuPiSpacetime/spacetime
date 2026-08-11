package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 补齐账号状态变更遗漏的关系投影和安全消息。 */
public interface MessageAccountFactReconcileService {
    int reconcileRecentAccountStatuses(LocalDateTime now, int limit);
}

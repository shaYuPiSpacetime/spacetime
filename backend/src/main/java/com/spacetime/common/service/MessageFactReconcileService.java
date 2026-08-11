package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 对账近期匹配事实，补齐缺失的私信会话投影。 */
public interface MessageFactReconcileService {
    int reconcileRecentMatches(LocalDateTime now, int limit);
}

package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 补齐订单和悄悄话补偿遗漏的资产结果消息。 */
public interface MessageAssetFactReconcileService {
    int reconcileRecentAssetResults(LocalDateTime now, int limit);
}

package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.service.AssetResultMessageNotificationService;
import com.spacetime.common.service.MessageAssetFactReconcileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 最近 24 小时资产结果事实对账。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageAssetFactReconcileServiceImpl implements MessageAssetFactReconcileService {
    private static final int MAX_LIMIT = 1000;

    private final TradeOrderDao tradeOrderDao;
    private final AppMessageWhisperDao whisperDao;
    private final AssetResultMessageNotificationService notificationService;

    @Override
    public int reconcileRecentAssetResults(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        int boundedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        LocalDateTime updatedAfter = effectiveNow.minusHours(24);
        int reconciled = 0;
        List<TradeOrder> orders = tradeOrderDao.selectMessageNotifiableWithoutInbox(
                updatedAfter, boundedLimit);
        if (orders != null) {
            for (TradeOrder order : orders) {
                if (publishOrder(order, effectiveNow)) {
                    reconciled++;
                }
            }
        }
        List<AppMessageWhisper> whispers = whisperDao.selectRefundedWithoutMessage(
                updatedAfter, boundedLimit);
        if (whispers != null) {
            for (AppMessageWhisper whisper : whispers) {
                if (publishWhisper(whisper, effectiveNow)) {
                    reconciled++;
                }
            }
        }
        return reconciled;
    }

    private boolean publishOrder(TradeOrder order, LocalDateTime fallback) {
        try {
            return notificationService.publishOrderNow(
                    order, order.getUpdateTime() == null ? fallback : order.getUpdateTime());
        } catch (RuntimeException ex) {
            log.warn("订单资产消息事实对账失败: orderNo={}, errorType={}",
                    order.getOrderNo(), ex.getClass().getSimpleName());
            return false;
        }
    }

    private boolean publishWhisper(AppMessageWhisper whisper, LocalDateTime fallback) {
        try {
            return notificationService.publishWhisperCompensationNow(
                    whisper, whisper.getUpdateTime() == null ? fallback : whisper.getUpdateTime());
        } catch (RuntimeException ex) {
            log.warn("悄悄话补偿消息事实对账失败: whisperNo={}, errorType={}",
                    whisper.getWhisperNo(), ex.getClass().getSimpleName());
            return false;
        }
    }
}

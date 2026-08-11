package com.spacetime.common.service.impl;

import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.enums.OrderStatusEnum;
import com.spacetime.common.enums.OrderTypeEnum;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.AfterCommitExecutor;
import com.spacetime.common.service.AssetResultMessageNotificationService;
import com.spacetime.common.service.MessageEventInboxService;
import com.spacetime.common.service.MessageEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/** 资产通知失败不影响订单、余额或补偿事实。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetResultMessageNotificationServiceImpl
        implements AssetResultMessageNotificationService {
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final CoinPackageDao coinPackageDao;
    private final UserAssetDao userAssetDao;
    private final MessageEventPublisher eventPublisher;
    private final MessageEventInboxService inboxService;
    private final AfterCommitExecutor afterCommitExecutor;

    @Override
    public void publishOrderAfterCommit(TradeOrder order, LocalDateTime occurredAt) {
        afterCommitExecutor.execute(() -> publishQuietly(
                () -> publishOrderNow(order, occurredAt), "order",
                order == null ? null : order.getOrderNo()));
    }

    @Override
    public boolean publishOrderNow(TradeOrder order, LocalDateTime occurredAt) {
        if (order == null || (!OrderStatusEnum.SUCCESS.getCode().equals(order.getOrderStatus())
                && !OrderStatusEnum.REFUNDED.getCode().equals(order.getOrderStatus()))) {
            return false;
        }
        require(order.getOrderNo(), "资产通知订单号不能为空");
        requireUser(order.getUserId());
        String producerEventId = "order:" + order.getOrderNo() + ":" + order.getOrderStatus();
        return publish(producerEventId, order.getUserId(), order.getOrderNo(),
                orderResult(order), occurredAt);
    }

    @Override
    public void publishWhisperCompensationAfterCommit(
            AppMessageWhisper whisper, LocalDateTime occurredAt) {
        afterCommitExecutor.execute(() -> publishQuietly(
                () -> publishWhisperCompensationNow(whisper, occurredAt), "whisper",
                whisper == null ? null : whisper.getWhisperNo()));
    }

    @Override
    public boolean publishWhisperCompensationNow(
            AppMessageWhisper whisper, LocalDateTime occurredAt) {
        if (whisper == null || !"refunded".equals(whisper.getPaymentStatus())) {
            return false;
        }
        require(whisper.getWhisperNo(), "悄悄话补偿业务号不能为空");
        requireUser(whisper.getSenderUserId());
        String result = "coin".equals(whisper.getPayType())
                ? "悄悄话发送失败，" + valueOrZero(whisper.getCoinAmount()) + "千寻币已原路退回"
                : "悄悄话发送失败，本次会员免费次数已恢复";
        return publish("whisper:" + whisper.getWhisperNo() + ":refunded",
                whisper.getSenderUserId(), whisper.getWhisperNo(), result, occurredAt);
    }

    private boolean publish(String producerEventId, Long userId, String bizNo,
                            String result, LocalDateTime occurredAt) {
        LocalDateTime effectiveTime = occurredAt == null ? LocalDateTime.now() : occurredAt;
        Long inboxId = eventPublisher.publishSystemMessage(new SystemMessageEvent(
                "prd04", producerEventId, userId, bizNo, "asset_result", "asset_result",
                Map.of("result", result), null), effectiveTime);
        inboxService.process(inboxId, effectiveTime);
        return true;
    }

    private String orderResult(TradeOrder order) {
        if (OrderStatusEnum.REFUNDED.getCode().equals(order.getOrderStatus())) {
            return "订单已退款，退款金额：¥" + decimal(order.getPayAmount());
        }
        if (OrderTypeEnum.COIN.getCode().equals(order.getOrderType())) {
            CoinPackage coinPackage = coinPackageDao.selectById(order.getPackageId());
            if (coinPackage == null) {
                throw new IllegalStateException("资产通知缺少千寻币套餐快照");
            }
            int amount = valueOrZero(coinPackage.getCoinCount())
                    + valueOrZero(coinPackage.getBonusCoinCount());
            return "千寻币已到账：" + amount;
        }
        if (OrderTypeEnum.VIP.getCode().equals(order.getOrderType())) {
            UserAsset asset = userAssetDao.selectByUserId(order.getUserId());
            if (asset == null || asset.getVipExpireTime() == null) {
                throw new IllegalStateException("资产通知缺少会员到期时间");
            }
            return "会员已开通，有效期至 " + asset.getVipExpireTime().format(TIME);
        }
        throw new IllegalStateException("资产通知订单类型不支持");
    }

    private void publishQuietly(Runnable action, String factType, String factNo) {
        try {
            action.run();
        } catch (RuntimeException ex) {
            log.warn("资产结果消息入箱失败，等待事实对账: factType={}, factNo={}, errorType={}",
                    factType, factNo, ex.getClass().getSimpleName());
        }
    }

    private void require(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }

    private void requireUser(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("资产通知用户不能为空");
        }
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private String decimal(BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
    }
}

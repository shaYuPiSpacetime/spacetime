package com.spacetime.common.service.impl;

import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.MessageEventInboxService;
import com.spacetime.common.service.MessageEventPublisher;
import com.spacetime.common.service.PromotionMessageNotificationService;
import com.spacetime.common.service.PromotionRetryPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/** 奖励结果适配器；不把内部失败原因透传给用户。 */
@Service
@RequiredArgsConstructor
public class PromotionMessageNotificationServiceImpl
        implements PromotionMessageNotificationService {
    private final MessageEventPublisher eventPublisher;
    private final MessageEventInboxService inboxService;

    @Override
    public boolean publishRewardResult(PromotionRewardLog reward, LocalDateTime now) {
        if (reward == null || !isPublishable(reward)) {
            return false;
        }
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        String status = reward.getStatus();
        String rewardNo = required(reward.getRewardNo(), "邀请奖励编号缺失");
        Long receiverUserId = reward.getInviterId();
        if (receiverUserId == null || receiverUserId <= 0) {
            throw new IllegalArgumentException("邀请奖励接收用户缺失");
        }
        String result = "success".equals(status)
                ? successText(reward) : failureText(reward);
        Long inboxId = eventPublisher.publishSystemMessage(new SystemMessageEvent(
                "prd07", rewardNo + ":" + status, receiverUserId, rewardNo,
                "invite_result", "invite_result", Map.of("result", result), null),
                effectiveNow);
        inboxService.process(inboxId, effectiveNow);
        return true;
    }

    private boolean isPublishable(PromotionRewardLog reward) {
        if ("success".equals(reward.getStatus())) {
            return true;
        }
        int terminalRetryCount = PromotionRetryPolicy.delays().size() + 1;
        return "failed".equals(reward.getStatus())
                && reward.getNextRetryTime() == null
                && valueOrZero(reward.getRetryCount()) >= terminalRetryCount;
    }

    private String successText(PromotionRewardLog reward) {
        return label(reward) + "已发放，获得" + amount(reward.getAmount()) + "千寻币";
    }

    private String failureText(PromotionRewardLog reward) {
        return label(reward) + "发放失败，请在邀请记录中查看";
    }

    private String label(PromotionRewardLog reward) {
        return StringUtils.hasText(reward.getEventLabelSnapshot())
                ? reward.getEventLabelSnapshot().trim() : "邀请奖励";
    }

    private String amount(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("邀请奖励金额缺失");
        }
        return amount.stripTrailingZeros().toPlainString();
    }

    private String required(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}

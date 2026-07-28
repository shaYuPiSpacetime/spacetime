package com.spacetime.common.service;

import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.enums.PromotionRuleTypeEnum;
import com.spacetime.common.enums.PromotionSourceTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.promotion.PromotionRuleDraft;
import com.spacetime.common.model.promotion.PromotionRuleEventDraft;
import com.spacetime.common.model.promotion.PromotionRuleTierDraft;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 推广规则纯业务校验器。
 */
@Component
public class PromotionRuleValidator {
    private static final Set<String> BASE_EVENT_TYPES = Set.of(
            PromotionRewardEventEnum.REGISTER_REWARD.getCode(),
            PromotionRewardEventEnum.PROFILE_COMPLETE_REWARD.getCode(),
            PromotionRewardEventEnum.VERIFY_COMPLETE_REWARD.getCode(),
            PromotionRewardEventEnum.FIRST_VIP_REWARD.getCode(),
            PromotionRewardEventEnum.FIRST_COIN_RECHARGE_REWARD.getCode());

    /**
     * 校验待发布规则。
     */
    public void validate(PromotionRuleDraft draft) {
        if (draft == null || !PromotionSourceTypeEnum.supports(draft.sourceType())) {
            throw new BusinessException("推广来源不支持");
        }
        if (!PromotionRuleTypeEnum.FIXED.getCode().equals(draft.rewardMode())
                && !PromotionRuleTypeEnum.LADDER.getCode().equals(draft.rewardMode())) {
            throw new BusinessException("奖励模式不支持");
        }
        List<PromotionRuleEventDraft> events = draft.events() == null ? List.of() : draft.events();
        Set<String> eventTypes = new HashSet<>();
        for (PromotionRuleEventDraft event : events) {
            if (!BASE_EVENT_TYPES.contains(event.eventType())) {
                throw new BusinessException("奖励事件不支持");
            }
            if (!eventTypes.add(event.eventType()) || event.amount() == null || event.amount().signum() < 0) {
                throw new BusinessException("奖励事件重复或金额非法");
            }
            validateAmount(draft.sourceType(), event.amount());
        }
        if (events.size() != BASE_EVENT_TYPES.size() || !eventTypes.equals(BASE_EVENT_TYPES)) {
            throw new BusinessException("必须且只能配置五个基础奖励事件");
        }
        PromotionRuleEventDraft register = events.stream()
                .filter(item -> PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(item.eventType()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("完成注册奖励为固定业务口径，必须配置"));
        if (!register.enabled()) {
            throw new BusinessException("完成注册奖励为固定业务口径，不可关闭");
        }
        List<PromotionRuleTierDraft> tiers = draft.tiers() == null ? List.of() : draft.tiers();
        if (PromotionRuleTypeEnum.FIXED.getCode().equals(draft.rewardMode()) && !tiers.isEmpty()) {
            throw new BusinessException("固定奖励模式不可配置阶梯档位");
        }
        if (PromotionRuleTypeEnum.LADDER.getCode().equals(draft.rewardMode())
                && tiers.stream().noneMatch(PromotionRuleTierDraft::enabled)) {
            throw new BusinessException("阶梯模式至少配置一档");
        }
        int previous = 0;
        for (PromotionRuleTierDraft tier : tiers) {
            if (tier.threshold() <= previous) {
                throw new BusinessException("阶梯阈值必须严格递增且不可重复");
            }
            if (tier.amount() == null || tier.amount().signum() <= 0) {
                throw new BusinessException("阶梯额外奖励金额必须大于0");
            }
            validateAmount(draft.sourceType(), tier.amount());
            previous = tier.threshold();
        }
    }

    private void validateAmount(String sourceType, BigDecimal amount) {
        if (PromotionSourceTypeEnum.isNormalUser(sourceType) && amount.stripTrailingZeros().scale() > 0) {
            throw new BusinessException("普通邀请奖励必须为非负整数");
        }
        if (PromotionSourceTypeEnum.isCampusAgent(sourceType) && amount.stripTrailingZeros().scale() > 2) {
            throw new BusinessException("校园推广员奖金最多保留两位小数");
        }
    }
}

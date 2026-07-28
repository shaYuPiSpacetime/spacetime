package com.spacetime.common.service;

import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.enums.PromotionSourceTypeEnum;
import com.spacetime.common.model.promotion.PromotionRuleDraft;
import com.spacetime.common.model.promotion.PromotionRuleEventDraft;
import com.spacetime.common.model.promotion.PromotionRuleTierDraft;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 推广规则发布校验测试。
 */
class PromotionRuleValidatorTest {

    private final PromotionRuleValidator validator = new PromotionRuleValidator();

    @Test
    void 完成注册奖励不可关闭或缺失() {
        PromotionRuleDraft disabled = draft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(),
                List.of(event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), false, "20")),
                List.of());
        assertThatThrownBy(() -> validator.validate(disabled))
                .hasMessageContaining("完成注册奖励");

        PromotionRuleDraft missing = rawDraft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(), "ladder", List.of(), List.of());
        assertThatThrownBy(() -> validator.validate(missing))
                .hasMessageContaining("五个基础奖励事件");
    }

    @Test
    void 普通奖励必须为非负整数() {
        PromotionRuleDraft draft = draft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(),
                List.of(event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, "20.5")),
                List.of());
        assertThatThrownBy(() -> validator.validate(draft))
                .hasMessageContaining("非负整数");
    }

    @Test
    void 代理金额最多两位小数() {
        PromotionRuleDraft draft = draft(
                PromotionSourceTypeEnum.CAMPUS_AGENT.getCode(),
                List.of(event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, "20.257")),
                List.of());
        assertThatThrownBy(() -> validator.validate(draft))
                .hasMessageContaining("两位小数");
    }

    @Test
    void 阶梯阈值必须严格递增且不可重复() {
        PromotionRuleDraft draft = draft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(),
                List.of(event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, "20")),
                List.of(tier(5, "50"), tier(5, "100")));
        assertThatThrownBy(() -> validator.validate(draft))
                .hasMessageContaining("严格递增");
    }

    @Test
    void 阶梯必须有启用档且额外金额大于零() {
        PromotionRuleDraft allDisabled = draft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(),
                List.of(event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, "20")),
                List.of(new PromotionRuleTierDraft(5, new BigDecimal("50"), false)));
        assertThatThrownBy(() -> validator.validate(allDisabled))
                .hasMessageContaining("至少配置一档");

        PromotionRuleDraft zero = draft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(),
                List.of(event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, "20")),
                List.of(tier(5, "0")));
        assertThatThrownBy(() -> validator.validate(zero))
                .hasMessageContaining("必须大于0");
    }

    @Test
    void 阶梯奖励不可混入基础事件列表() {
        PromotionRuleDraft draft = draft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(),
                List.of(
                        event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, "20"),
                        event(PromotionRewardEventEnum.LADDER_BONUS.getCode(), true, "50")),
                List.of(tier(5, "50")));
        assertThatThrownBy(() -> validator.validate(draft))
                .hasMessageContaining("事件不支持");
    }

    @Test
    void 基础事件必须恰好五类且不可重复() {
        PromotionRuleDraft missing = rawDraft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(), "ladder",
                List.of(event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, "20")),
                List.of(tier(5, "50")));
        assertThatThrownBy(() -> validator.validate(missing))
                .hasMessageContaining("五个基础奖励事件");

        List<PromotionRuleEventDraft> duplicated = completeEvents(List.of());
        duplicated.set(4, event(PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, "20"));
        PromotionRuleDraft duplicate = rawDraft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(), "ladder", duplicated, List.of(tier(5, "50")));
        assertThatThrownBy(() -> validator.validate(duplicate))
                .hasMessageContaining("重复");
    }

    @Test
    void 固定模式不可携带阶梯档位() {
        PromotionRuleDraft fixed = rawDraft(
                PromotionSourceTypeEnum.NORMAL_USER.getCode(), "fixed",
                completeEvents(List.of()), List.of(tier(5, "50")));
        assertThatThrownBy(() -> validator.validate(fixed))
                .hasMessageContaining("不可配置阶梯");
    }

    private PromotionRuleDraft draft(String sourceType,
                                     List<PromotionRuleEventDraft> events,
                                     List<PromotionRuleTierDraft> tiers) {
        return rawDraft(sourceType, "ladder", completeEvents(events), tiers);
    }

    private PromotionRuleDraft rawDraft(String sourceType,
                                        String rewardMode,
                                        List<PromotionRuleEventDraft> events,
                                        List<PromotionRuleTierDraft> tiers) {
        return new PromotionRuleDraft(sourceType, rewardMode, 0, events, tiers);
    }

    private List<PromotionRuleEventDraft> completeEvents(List<PromotionRuleEventDraft> overrides) {
        Map<String, PromotionRuleEventDraft> byType = overrides.stream()
                .collect(Collectors.toMap(PromotionRuleEventDraft::eventType, item -> item));
        List<PromotionRuleEventDraft> result = new ArrayList<>();
        result.add(byType.getOrDefault("register_reward", event("register_reward", true, "20")));
        result.add(byType.getOrDefault("profile_complete_reward", event("profile_complete_reward", false, "0")));
        result.add(byType.getOrDefault("verify_complete_reward", event("verify_complete_reward", false, "0")));
        result.add(byType.getOrDefault("first_vip_reward", event("first_vip_reward", false, "0")));
        result.add(byType.getOrDefault("first_coin_recharge_reward", event("first_coin_recharge_reward", false, "0")));
        overrides.stream()
                .filter(item -> !byType.containsKey(item.eventType())
                        || !result.stream().anyMatch(existing -> existing.eventType().equals(item.eventType())))
                .forEach(result::add);
        return result;
    }

    private PromotionRuleEventDraft event(String type, boolean enabled, String amount) {
        return new PromotionRuleEventDraft(type, enabled, new BigDecimal(amount));
    }

    private PromotionRuleTierDraft tier(int threshold, String amount) {
        return new PromotionRuleTierDraft(threshold, new BigDecimal(amount), true);
    }
}

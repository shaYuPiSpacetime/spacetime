package com.spacetime.common.service.impl;

import com.spacetime.common.dao.PromotionRuleCurrentDao;
import com.spacetime.common.dao.PromotionRuleDao;
import com.spacetime.common.dao.PromotionRuleEventDao;
import com.spacetime.common.dao.PromotionRuleTierDao;
import com.spacetime.common.entity.PromotionRule;
import com.spacetime.common.entity.PromotionRuleCurrent;
import com.spacetime.common.entity.PromotionRuleEvent;
import com.spacetime.common.entity.PromotionRuleTier;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.promotion.PromotionRuleDraft;
import com.spacetime.common.model.promotion.PromotionRuleEventDraft;
import com.spacetime.common.model.promotion.PromotionRuleTierDraft;
import com.spacetime.common.service.PromotionRuleDomainService;
import com.spacetime.common.service.PromotionRuleEventSnapshot;
import com.spacetime.common.service.PromotionRuleSnapshot;
import com.spacetime.common.service.PromotionRuleTierSnapshot;
import com.spacetime.common.service.PromotionRuleValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 推广不可变规则领域服务实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionRuleDomainServiceImpl implements PromotionRuleDomainService {
    private static final Map<String, String> EVENT_LABELS = Map.of(
            "register_reward", "完成注册",
            "profile_complete_reward", "完善资料",
            "verify_complete_reward", "完成认证",
            "first_vip_reward", "首次开通会员",
            "first_coin_recharge_reward", "首次充值千寻币",
            "ladder_bonus", "阶梯奖励");

    private final PromotionRuleDao ruleDao;
    private final PromotionRuleCurrentDao currentDao;
    private final PromotionRuleEventDao eventDao;
    private final PromotionRuleTierDao tierDao;
    private final PromotionRuleValidator validator;

    @Override
    public PromotionRuleSnapshot current(String sourceType) {
        PromotionRuleCurrent current = currentDao.selectBySourceType(sourceType);
        if (current == null) {
            return null;
        }
        return byId(current.getRuleId());
    }

    @Override
    public PromotionRuleSnapshot byId(Long ruleId) {
        PromotionRule rule = ruleDao.selectById(ruleId);
        if (rule == null) {
            throw new BusinessException(404, "推广规则版本不存在");
        }
        return toSnapshot(rule);
    }

    @Override
    @Transactional
    public PromotionRuleSnapshot publish(PromotionRuleDraft draft) {
        validator.validate(draft);
        PromotionRuleCurrent current = currentDao.selectBySourceTypeForUpdate(draft.sourceType());
        int actualVersion = current == null ? 0 : current.getVersionNo();
        if (actualVersion != draft.expectedVersion()) {
            throw new BusinessException(409, "规则版本已更新，请刷新后重试");
        }
        if (current != null) {
            PromotionRule old = ruleDao.selectById(current.getRuleId());
            if (old != null) {
                old.setStatus("superseded");
                ruleDao.updateById(old);
            }
        }
        PromotionRule rule = new PromotionRule();
        rule.setSourceType(draft.sourceType());
        rule.setRewardMode(draft.rewardMode());
        rule.setVersionNo(actualVersion + 1);
        rule.setStatus("published");
        rule.setPublishedAt(LocalDateTime.now());
        ruleDao.insert(rule);

        for (PromotionRuleEventDraft item : draft.events()) {
            PromotionRuleEvent event = new PromotionRuleEvent();
            event.setRuleId(rule.getId());
            event.setEventType(item.eventType());
            event.setEventLabel(EVENT_LABELS.getOrDefault(item.eventType(), item.eventType()));
            event.setEnabled(item.enabled());
            event.setAmount(item.amount());
            eventDao.insert(event);
        }
        if (draft.tiers() != null && "ladder".equals(draft.rewardMode())) {
            for (PromotionRuleTierDraft item : draft.tiers()) {
                PromotionRuleTier tier = new PromotionRuleTier();
                tier.setRuleId(rule.getId());
                tier.setThresholdCount(item.threshold());
                tier.setAmount(item.amount());
                tier.setEnabled(item.enabled());
                tierDao.insert(tier);
            }
        }
        if (current == null) {
            current = new PromotionRuleCurrent();
            current.setSourceType(draft.sourceType());
            current.setRuleId(rule.getId());
            current.setVersionNo(rule.getVersionNo());
            try {
                currentDao.insert(current);
            } catch (DuplicateKeyException ex) {
                throw new BusinessException(409, "规则版本已更新，请刷新后重试");
            }
        } else {
            current.setRuleId(rule.getId());
            current.setVersionNo(rule.getVersionNo());
            currentDao.updateById(current);
        }
        return new PromotionRuleSnapshot(
                rule.getId(),
                rule.getSourceType(),
                rule.getRewardMode(),
                rule.getVersionNo(),
                draft.events().stream().map(item -> new PromotionRuleEventSnapshot(
                        item.eventType(),
                        EVENT_LABELS.getOrDefault(item.eventType(), item.eventType()),
                        item.enabled(),
                        item.amount())).toList(),
                draft.tiers() == null ? List.of() : draft.tiers().stream()
                        .map(item -> new PromotionRuleTierSnapshot(item.threshold(), item.amount(), item.enabled()))
                        .toList(),
                rule.getPublishedAt());
    }

    private PromotionRuleSnapshot toSnapshot(PromotionRule rule) {
        List<PromotionRuleEventSnapshot> events = eventDao.selectByRuleId(rule.getId()).stream()
                .map(item -> new PromotionRuleEventSnapshot(
                        item.getEventType(), item.getEventLabel(),
                        Boolean.TRUE.equals(item.getEnabled()), item.getAmount()))
                .toList();
        List<PromotionRuleTierSnapshot> tiers = tierDao.selectByRuleId(rule.getId()).stream()
                .map(item -> new PromotionRuleTierSnapshot(
                        item.getThresholdCount(), item.getAmount(), Boolean.TRUE.equals(item.getEnabled())))
                .toList();
        return new PromotionRuleSnapshot(
                rule.getId(), rule.getSourceType(), rule.getRewardMode(), rule.getVersionNo(),
                events, tiers, rule.getPublishedAt());
    }
}

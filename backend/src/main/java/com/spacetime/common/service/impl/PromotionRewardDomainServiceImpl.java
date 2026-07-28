package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import com.spacetime.common.dao.PromotionInviteCounterDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionInviteCounter;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionRewardDomainService;
import com.spacetime.common.service.PromotionRuleEventSnapshot;
import com.spacetime.common.service.PromotionRuleSnapshot;
import com.spacetime.common.service.PromotionRuleTierSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 普通邀请奖励生成领域服务实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionRewardDomainServiceImpl implements PromotionRewardDomainService {
    private final PromotionRewardLogDao rewardDao;
    private final PromotionInviteCounterDao counterDao;

    @Override
    @Transactional
    public List<PromotionRewardLog> createForEvent(PromotionInviteRelation relation,
                                                   String eventType,
                                                   PromotionRuleSnapshot rule,
                                                   LocalDateTime occurredAt) {
        if (relation == null || relation.getId() == null || relation.getInviterId() == null) {
            throw new BusinessException("普通邀请关系数据不完整");
        }
        String baseKey = "normal:" + relation.getId() + ":" + eventType;
        PromotionRewardLog existing = rewardDao.selectByIdempotencyKey(baseKey);
        if (existing != null) {
            return List.of(existing);
        }
        PromotionRuleEventSnapshot event = rule.events().stream()
                .filter(item -> item.eventType().equals(eventType) && item.enabled())
                .findFirst()
                .orElse(null);
        if (event == null) {
            return List.of();
        }
        List<PromotionRewardLog> result = new ArrayList<>();
        CreatedReward base = insertReward(
                relation, eventType, event.eventLabel(), null, event.amount(), rule, baseKey);
        result.add(base.reward());
        if (!base.created()) {
            return result;
        }
        if (PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(eventType)
                && "ladder".equals(rule.rewardMode())) {
            int successCount = incrementCounter(relation.getInviterId());
            rule.tiers().stream()
                    .filter(PromotionRuleTierSnapshot::enabled)
                    .filter(item -> item.threshold() == successCount)
                    .findFirst()
                    .ifPresent(tier -> {
                        String ladderKey = "normal:" + relation.getInviterId() + ":ladder:" + tier.threshold();
                        PromotionRewardLog ladder = rewardDao.selectByIdempotencyKey(ladderKey);
                        if (ladder == null) {
                            ladder = insertReward(
                                    relation,
                                    PromotionRewardEventEnum.LADDER_BONUS.getCode(),
                                    "阶梯奖励-累计" + tier.threshold() + "人",
                                    tier.threshold(),
                                    tier.amount(),
                                    rule,
                                    ladderKey).reward();
                        }
                        result.add(ladder);
                    });
        }
        return result;
    }

    private int incrementCounter(Long inviterId) {
        PromotionInviteCounter counter = counterDao.selectForUpdate("normal_user", inviterId);
        if (counter == null) {
            counter = new PromotionInviteCounter();
            counter.setSourceType("normal_user");
            counter.setRewardObjectId(inviterId);
            counter.setSuccessCount(1);
            try {
                counterDao.insert(counter);
                return 1;
            } catch (DuplicateKeyException ex) {
                counter = counterDao.selectForUpdate("normal_user", inviterId);
            }
        }
        int next = counter.getSuccessCount() + 1;
        counterDao.increment(counter.getId());
        return next;
    }

    private CreatedReward insertReward(PromotionInviteRelation relation,
                                       String eventType,
                                       String eventLabel,
                                       Integer threshold,
                                       java.math.BigDecimal amount,
                                       PromotionRuleSnapshot rule,
                                       String idempotencyKey) {
        PromotionRewardLog reward = new PromotionRewardLog();
        reward.setRewardNo("IRW-" + IdUtil.getSnowflakeNextIdStr());
        reward.setRelationId(relation.getId());
        reward.setInviterId(relation.getInviterId());
        reward.setInviteeId(relation.getInviteeId());
        reward.setEventType(eventType);
        reward.setEventLabelSnapshot(eventLabel);
        reward.setRuleId(rule.ruleId());
        reward.setRuleVersion(rule.version());
        reward.setLadderThreshold(threshold);
        reward.setAmount(amount);
        reward.setStatus(PromotionRewardStatusEnum.PENDING.getCode());
        reward.setIdempotencyKey(idempotencyKey);
        reward.setRetryCount(0);
        try {
            rewardDao.insert(reward);
            return new CreatedReward(reward, true);
        } catch (DuplicateKeyException ex) {
            PromotionRewardLog winner = rewardDao.selectByIdempotencyKey(idempotencyKey);
            if (winner != null) {
                return new CreatedReward(winner, false);
            }
            throw ex;
        }
    }

    private record CreatedReward(PromotionRewardLog reward, boolean created) {
    }
}

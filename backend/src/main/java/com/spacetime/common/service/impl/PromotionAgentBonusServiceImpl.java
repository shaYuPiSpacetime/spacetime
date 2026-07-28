package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import com.spacetime.common.dao.PromotionAgentBonusLogDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentStatDao;
import com.spacetime.common.dao.PromotionInviteCounterDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentBonusLog;
import com.spacetime.common.entity.PromotionAgentStat;
import com.spacetime.common.entity.PromotionInviteCounter;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.enums.PromotionAgentStatusEnum;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.service.PromotionAgentBonusService;
import com.spacetime.common.service.PromotionRuleEventSnapshot;
import com.spacetime.common.service.PromotionRuleSnapshot;
import com.spacetime.common.service.PromotionRuleTierSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 校园推广员奖金生成服务实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionAgentBonusServiceImpl implements PromotionAgentBonusService {
    private final PromotionAgentDao agentDao;
    private final PromotionAgentBonusLogDao bonusDao;
    private final PromotionInviteCounterDao counterDao;
    private final PromotionAgentStatDao statDao;

    @Override
    @Transactional
    public List<PromotionAgentBonusLog> createForEvent(PromotionInviteRelation relation,
                                                       String eventType,
                                                       PromotionRuleSnapshot rule,
                                                       LocalDateTime occurredAt) {
        PromotionAgent agent = relation == null || relation.getAgentId() == null
                ? null : agentDao.selectById(relation.getAgentId());
        if (agent == null || !PromotionAgentStatusEnum.ENABLED.getCode().equals(agent.getStatus())) {
            return List.of();
        }
        String baseKey = "agent:" + relation.getId() + ":" + eventType;
        PromotionAgentBonusLog existing = bonusDao.selectByIdempotencyKey(baseKey);
        if (existing != null) {
            return List.of(existing);
        }
        PromotionRuleEventSnapshot event = rule.events().stream()
                .filter(item -> item.eventType().equals(eventType) && item.enabled())
                .findFirst().orElse(null);
        if (event == null) {
            return List.of();
        }
        List<PromotionAgentBonusLog> result = new ArrayList<>();
        CreatedBonus base = insertBonus(relation, eventType, event.eventLabel(), null,
                event.amount(), rule, occurredAt, baseKey);
        result.add(base.bonus());
        if (!base.created()) {
            return result;
        }
        if (PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(eventType)
                && "ladder".equals(rule.rewardMode())) {
            int count = incrementCounter(agent.getId());
            rule.tiers().stream()
                    .filter(PromotionRuleTierSnapshot::enabled)
                    .filter(tier -> tier.threshold() == count)
                    .findFirst()
                    .ifPresent(tier -> {
                        String key = "agent:" + agent.getId() + ":ladder:" + tier.threshold();
                        PromotionAgentBonusLog ladder = bonusDao.selectByIdempotencyKey(key);
                        if (ladder == null) {
                            ladder = insertBonus(relation,
                                    PromotionRewardEventEnum.LADDER_BONUS.getCode(),
                                    "阶梯奖励-累计" + tier.threshold() + "人",
                                    tier.threshold(), tier.amount(), rule, occurredAt, key).bonus();
                        }
                        result.add(ladder);
                    });
        }
        refreshStat(agent, eventType, result);
        return result;
    }

    private int incrementCounter(Long agentId) {
        PromotionInviteCounter counter = counterDao.selectForUpdate("campus_agent", agentId);
        if (counter == null) {
            counter = new PromotionInviteCounter();
            counter.setSourceType("campus_agent");
            counter.setRewardObjectId(agentId);
            counter.setSuccessCount(1);
            try {
                counterDao.insert(counter);
                return 1;
            } catch (DuplicateKeyException ex) {
                counter = counterDao.selectForUpdate("campus_agent", agentId);
            }
        }
        int next = counter.getSuccessCount() + 1;
        counterDao.increment(counter.getId());
        return next;
    }

    private CreatedBonus insertBonus(PromotionInviteRelation relation,
                                     String eventType,
                                     String eventLabel,
                                     Integer threshold,
                                     BigDecimal amount,
                                     PromotionRuleSnapshot rule,
                                     LocalDateTime occurredAt,
                                     String key) {
        PromotionAgentBonusLog bonus = new PromotionAgentBonusLog();
        bonus.setBonusNo("ABN-" + IdUtil.getSnowflakeNextIdStr());
        bonus.setAgentId(relation.getAgentId());
        bonus.setRelationId(relation.getId());
        bonus.setInviteeId(relation.getInviteeId());
        bonus.setEventType(eventType);
        bonus.setEventLabelSnapshot(eventLabel);
        bonus.setRuleId(rule.ruleId());
        bonus.setRuleVersion(rule.version());
        bonus.setLadderThreshold(threshold);
        bonus.setAmount(amount);
        bonus.setOccurredAt(occurredAt == null ? LocalDateTime.now() : occurredAt);
        bonus.setIdempotencyKey(key);
        try {
            bonusDao.insert(bonus);
            return new CreatedBonus(bonus, true);
        } catch (DuplicateKeyException ex) {
            PromotionAgentBonusLog winner = bonusDao.selectByIdempotencyKey(key);
            if (winner != null) {
                return new CreatedBonus(winner, false);
            }
            throw ex;
        }
    }

    private void refreshStat(PromotionAgent agent,
                             String eventType,
                             List<PromotionAgentBonusLog> bonuses) {
        PromotionAgentStat stat = statDao.selectByAgentIdForUpdate(agent.getId());
        boolean created = stat == null;
        if (created) {
            stat = new PromotionAgentStat();
            stat.setAgentId(agent.getId());
            stat.setAgentNo(agent.getAgentNo());
            stat.setClickCnt(0);
            stat.setSuccessInviteCount(0);
            stat.setTotalBonusAmount(BigDecimal.ZERO);
            stat.setPendingBonusAmount(BigDecimal.ZERO);
            stat.setConfirmedBonusAmount(BigDecimal.ZERO);
            stat.setStatVersion(0);
        }
        if (PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(eventType)) {
            stat.setSuccessInviteCount(stat.getSuccessInviteCount() + 1);
        }
        BigDecimal added = bonuses.stream()
                .map(PromotionAgentBonusLog::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stat.setTotalBonusAmount(stat.getTotalBonusAmount().add(added));
        stat.setPendingBonusAmount(stat.getPendingBonusAmount().add(added));
        stat.setStatVersion(stat.getStatVersion() + 1);
        if (created) {
            try {
                statDao.insert(stat);
            } catch (DuplicateKeyException ex) {
                PromotionAgentStat winner = statDao.selectByAgentIdForUpdate(agent.getId());
                if (winner == null) {
                    throw ex;
                }
                if (PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(eventType)) {
                    winner.setSuccessInviteCount(winner.getSuccessInviteCount() + 1);
                }
                winner.setTotalBonusAmount(winner.getTotalBonusAmount().add(added));
                winner.setPendingBonusAmount(winner.getPendingBonusAmount().add(added));
                winner.setStatVersion(winner.getStatVersion() + 1);
                statDao.updateById(winner);
            }
        } else {
            statDao.updateById(stat);
        }
    }

    private record CreatedBonus(PromotionAgentBonusLog bonus, boolean created) {
    }
}

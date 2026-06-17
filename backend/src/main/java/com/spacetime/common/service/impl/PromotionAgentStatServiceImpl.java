package com.spacetime.common.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentBonusLogDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.dao.PromotionAgentSettlementDao;
import com.spacetime.common.dao.PromotionAgentStatDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentBonusLog;
import com.spacetime.common.entity.PromotionAgentEvent;
import com.spacetime.common.entity.PromotionAgentSettlement;
import com.spacetime.common.entity.PromotionAgentStat;
import com.spacetime.common.enums.PromotionBonusStatusEnum;
import com.spacetime.common.enums.PromotionRelationStatusEnum;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.enums.PromotionSettlementStatusEnum;
import com.spacetime.common.service.PromotionAgentStatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 代理统计预聚合服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PromotionAgentStatServiceImpl implements PromotionAgentStatService {
    private static final int MAX_FACT_ROWS = 10_000;

    private final PromotionAgentStatDao statDao;
    private final PromotionAgentDao agentDao;
    private final PromotionAgentEventDao eventDao;
    private final PromotionAgentBonusLogDao bonusLogDao;
    private final PromotionAgentSettlementDao settlementDao;

    @Override
    @Transactional
    public void initAgentStat(PromotionAgent agent) {
        if (agent == null || agent.getId() == null || statDao.selectByAgentId(agent.getId()) != null) {
            return;
        }
        PromotionAgentStat stat = emptyStat(agent.getId(), agent.getAgentNo());
        statDao.insert(stat);
    }

    @Override
    public PromotionAgentStat getOrEmpty(Long agentId) {
        PromotionAgentStat stat = agentId == null ? null : statDao.selectByAgentId(agentId);
        if (stat != null) {
            normalize(stat);
            return stat;
        }
        PromotionAgent agent = agentId == null ? null : agentDao.selectById(agentId);
        return emptyStat(agentId, agent == null ? null : agent.getAgentNo());
    }

    @Override
    public void safeRefreshByEvent(Long agentId) {
        safeRebuild(agentId, "event");
    }

    @Override
    public void safeRefreshByBonus(Long agentId) {
        safeRebuild(agentId, "bonus");
    }

    @Override
    public void safeRefreshBySettlement(Long agentId) {
        safeRebuild(agentId, "settlement");
    }

    @Override
    @Transactional
    public PromotionAgentStat rebuildAgentStat(Long agentId) {
        if (agentId == null) {
            return emptyStat(null, null);
        }
        PromotionAgent agent = agentDao.selectById(agentId);
        PromotionAgentStat stat = statDao.selectByAgentId(agentId);
        if (stat == null) {
            stat = emptyStat(agentId, agent == null ? null : agent.getAgentNo());
            statDao.insert(stat);
        }
        stat.setAgentNo(agent == null ? stat.getAgentNo() : agent.getAgentNo());
        resetCounters(stat);
        applyEvents(stat, eventRows(agentId));
        applyBonusLogs(stat, bonusRows(agentId));
        applySettlements(stat, settlementRows(agentId));
        stat.setLastRebuildTime(LocalDateTime.now());
        stat.setStatVersion(nvl(stat.getStatVersion()) + 1);
        statDao.updateById(stat);
        return stat;
    }

    private void safeRebuild(Long agentId, String reason) {
        if (agentId == null) {
            return;
        }
        try {
            rebuildAgentStat(agentId);
        } catch (Exception ex) {
            log.warn("refresh promo_agent_stat failed, agentId={}, reason={}", agentId, reason, ex);
        }
    }

    private void applyEvents(PromotionAgentStat stat, List<PromotionAgentEvent> events) {
        LocalDateTime lastEventTime = null;
        for (PromotionAgentEvent event : events) {
            String eventType = event.getEventType();
            if ("click".equals(eventType)) {
                stat.setClickCnt(nvl(stat.getClickCnt()) + 1);
            } else if (isRegisterEvent(eventType)) {
                stat.setRegisterCnt(nvl(stat.getRegisterCnt()) + 1);
            } else if (isProfileEvent(eventType)) {
                stat.setProfileCnt(nvl(stat.getProfileCnt()) + 1);
            } else if (isVerifyEvent(eventType)) {
                stat.setVerifyCnt(nvl(stat.getVerifyCnt()) + 1);
                stat.setSuccessCnt(nvl(stat.getSuccessCnt()) + 1);
            } else if (PromotionRewardEventEnum.FIRST_VIP_REWARD.getCode().equals(eventType) || "first_vip".equals(eventType)) {
                stat.setFirstVipCnt(nvl(stat.getFirstVipCnt()) + 1);
            } else if (PromotionRewardEventEnum.FIRST_COIN_RECHARGE_REWARD.getCode().equals(eventType)
                    || "first_coin_recharge".equals(eventType)) {
                stat.setFirstCoinRechargeCnt(nvl(stat.getFirstCoinRechargeCnt()) + 1);
            }
            if (event.getEventTime() != null && (lastEventTime == null || event.getEventTime().isAfter(lastEventTime))) {
                lastEventTime = event.getEventTime();
            }
        }
        stat.setLastEventTime(lastEventTime);
    }

    private void applyBonusLogs(PromotionAgentStat stat, List<PromotionAgentBonusLog> bonusLogs) {
        for (PromotionAgentBonusLog log : bonusLogs) {
            BigDecimal amount = nz(log.getBonusAmount());
            if (!PromotionBonusStatusEnum.CANCELLED.getCode().equals(log.getStatus())) {
                stat.setBonusDueAmount(stat.getBonusDueAmount().add(amount));
            }
            if (PromotionBonusStatusEnum.PENDING_SETTLEMENT.getCode().equals(log.getStatus())) {
                stat.setBonusPendingAmount(stat.getBonusPendingAmount().add(amount));
            } else if (PromotionBonusStatusEnum.CONFIRMED.getCode().equals(log.getStatus())) {
                stat.setBonusConfirmedAmount(stat.getBonusConfirmedAmount().add(amount));
            } else if (PromotionBonusStatusEnum.PAID.getCode().equals(log.getStatus())) {
                stat.setBonusPaidAmount(stat.getBonusPaidAmount().add(amount));
            }
        }
    }

    private void applySettlements(PromotionAgentStat stat, List<PromotionAgentSettlement> settlements) {
        LocalDateTime lastSettlementTime = null;
        for (PromotionAgentSettlement settlement : settlements) {
            if (PromotionSettlementStatusEnum.CONFIRMED.getCode().equals(settlement.getStatus())
                    && settlement.getConfirmTime() != null
                    && (lastSettlementTime == null || settlement.getConfirmTime().isAfter(lastSettlementTime))) {
                lastSettlementTime = settlement.getConfirmTime();
            }
            if (PromotionSettlementStatusEnum.PAID.getCode().equals(settlement.getStatus())
                    && settlement.getPaidTime() != null
                    && (lastSettlementTime == null || settlement.getPaidTime().isAfter(lastSettlementTime))) {
                lastSettlementTime = settlement.getPaidTime();
            }
        }
        stat.setLastSettlementTime(lastSettlementTime);
    }

    private List<PromotionAgentEvent> eventRows(Long agentId) {
        Page<PromotionAgentEvent> page = eventDao.selectPage(new Page<>(1, MAX_FACT_ROWS, false),
                new LambdaQueryWrapper<PromotionAgentEvent>().eq(PromotionAgentEvent::getAgentId, agentId));
        return page.getRecords();
    }

    private List<PromotionAgentBonusLog> bonusRows(Long agentId) {
        Page<PromotionAgentBonusLog> page = bonusLogDao.selectPage(new Page<>(1, MAX_FACT_ROWS, false),
                new LambdaQueryWrapper<PromotionAgentBonusLog>().eq(PromotionAgentBonusLog::getAgentId, agentId));
        return page.getRecords();
    }

    private List<PromotionAgentSettlement> settlementRows(Long agentId) {
        Page<PromotionAgentSettlement> page = settlementDao.selectPage(new Page<>(1, MAX_FACT_ROWS, false),
                new LambdaQueryWrapper<PromotionAgentSettlement>().eq(PromotionAgentSettlement::getAgentId, agentId));
        return page.getRecords();
    }

    private boolean isRegisterEvent(String eventType) {
        return PromotionRelationStatusEnum.REGISTERED.getCode().equals(eventType)
                || PromotionRewardEventEnum.REGISTER_LOGIN_REWARD.getCode().equals(eventType);
    }

    private boolean isProfileEvent(String eventType) {
        return PromotionRelationStatusEnum.PROFILE_COMPLETED.getCode().equals(eventType)
                || PromotionRewardEventEnum.PROFILE_COMPLETE_REWARD.getCode().equals(eventType);
    }

    private boolean isVerifyEvent(String eventType) {
        return PromotionRelationStatusEnum.VERIFY_SUCCESS.getCode().equals(eventType)
                || PromotionRewardEventEnum.VERIFY_COMPLETE_REWARD.getCode().equals(eventType);
    }

    private PromotionAgentStat emptyStat(Long agentId, String agentNo) {
        PromotionAgentStat stat = new PromotionAgentStat();
        stat.setAgentId(agentId);
        stat.setAgentNo(agentNo);
        resetCounters(stat);
        stat.setStatVersion(0);
        return stat;
    }

    private void resetCounters(PromotionAgentStat stat) {
        stat.setClickCnt(0);
        stat.setRegisterCnt(0);
        stat.setProfileCnt(0);
        stat.setVerifyCnt(0);
        stat.setSuccessCnt(0);
        stat.setFirstVipCnt(0);
        stat.setFirstCoinRechargeCnt(0);
        stat.setBonusDueAmount(BigDecimal.ZERO);
        stat.setBonusPendingAmount(BigDecimal.ZERO);
        stat.setBonusConfirmedAmount(BigDecimal.ZERO);
        stat.setBonusPaidAmount(BigDecimal.ZERO);
        stat.setLastEventTime(null);
        stat.setLastSettlementTime(null);
    }

    private void normalize(PromotionAgentStat stat) {
        stat.setClickCnt(nvl(stat.getClickCnt()));
        stat.setRegisterCnt(nvl(stat.getRegisterCnt()));
        stat.setProfileCnt(nvl(stat.getProfileCnt()));
        stat.setVerifyCnt(nvl(stat.getVerifyCnt()));
        stat.setSuccessCnt(nvl(stat.getSuccessCnt()));
        stat.setFirstVipCnt(nvl(stat.getFirstVipCnt()));
        stat.setFirstCoinRechargeCnt(nvl(stat.getFirstCoinRechargeCnt()));
        stat.setBonusDueAmount(nz(stat.getBonusDueAmount()));
        stat.setBonusPendingAmount(nz(stat.getBonusPendingAmount()));
        stat.setBonusConfirmedAmount(nz(stat.getBonusConfirmedAmount()));
        stat.setBonusPaidAmount(nz(stat.getBonusPaidAmount()));
        stat.setStatVersion(nvl(stat.getStatVersion()));
    }

    private int nvl(Integer value) {
        return value == null ? 0 : value;
    }

    private BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}

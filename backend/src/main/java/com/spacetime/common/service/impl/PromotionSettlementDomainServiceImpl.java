package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentBonusLogDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentSettlementDao;
import com.spacetime.common.dao.PromotionAgentStatDao;
import com.spacetime.common.dao.PromotionEventInboxDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentBonusLog;
import com.spacetime.common.entity.PromotionAgentSettlement;
import com.spacetime.common.entity.PromotionAgentStat;
import com.spacetime.common.enums.PromotionSettlementStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionSettlementDomainService;
import com.spacetime.common.service.PromotionSettlementPeriod;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * 校园推广员自然月结算服务实现。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PromotionSettlementDomainServiceImpl implements PromotionSettlementDomainService {
    private final PromotionAgentDao agentDao;
    private final PromotionAgentBonusLogDao bonusDao;
    private final PromotionAgentSettlementDao settlementDao;
    private final PromotionAgentStatDao statDao;
    private final PromotionEventInboxDao inboxDao;

    @Override
    @Transactional
    public List<PromotionAgentSettlement> generate(YearMonth month) {
        PromotionSettlementPeriod period = PromotionSettlementPeriod.of(month);
        Page<com.spacetime.common.entity.PromotionEventInbox> incomplete = inboxDao.selectPage(
                new Page<>(1, 1, false),
                new LambdaQueryWrapper<com.spacetime.common.entity.PromotionEventInbox>()
                        .ne(com.spacetime.common.entity.PromotionEventInbox::getStatus, "success")
                        .ge(com.spacetime.common.entity.PromotionEventInbox::getCreateTime, period.startInclusive())
                        .lt(com.spacetime.common.entity.PromotionEventInbox::getCreateTime, period.endExclusive()));
        if (!incomplete.getRecords().isEmpty()) {
            log.warn("推广结算已阻塞，月份={}，存在未完成推广事件", month);
            return List.of();
        }
        Page<PromotionAgent> agents = agentDao.selectPage(
                new Page<>(1, 10000, false),
                new LambdaQueryWrapper<PromotionAgent>().orderByAsc(PromotionAgent::getId));
        List<PromotionAgentSettlement> created = new ArrayList<>();
        for (PromotionAgent agent : agents.getRecords()) {
            if (settlementDao.selectByAgentIdAndMonth(agent.getId(), period.month()) != null) {
                continue;
            }
            Page<PromotionAgentBonusLog> page = bonusDao.selectPage(
                    new Page<>(1, 10000, false),
                    new LambdaQueryWrapper<PromotionAgentBonusLog>()
                            .eq(PromotionAgentBonusLog::getAgentId, agent.getId())
                            .isNull(PromotionAgentBonusLog::getSettlementId)
                            .ge(PromotionAgentBonusLog::getOccurredAt, period.startInclusive())
                            .lt(PromotionAgentBonusLog::getOccurredAt, period.endExclusive())
                            .orderByAsc(PromotionAgentBonusLog::getId));
            BigDecimal amount = page.getRecords().stream()
                    .map(PromotionAgentBonusLog::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (amount.signum() <= 0) {
                continue;
            }
            PromotionAgentSettlement settlement = new PromotionAgentSettlement();
            settlement.setSettlementNo("STL-" + IdUtil.getSnowflakeNextIdStr());
            settlement.setAgentId(agent.getId());
            settlement.setSettlementMonth(period.month());
            settlement.setPayableAmount(amount);
            settlement.setStatus(PromotionSettlementStatusEnum.PENDING_CONFIRM.getCode());
            try {
                settlementDao.insert(settlement);
            } catch (DuplicateKeyException ex) {
                if (settlementDao.selectByAgentIdAndMonth(agent.getId(), period.month()) != null) {
                    continue;
                }
                throw ex;
            }
            for (PromotionAgentBonusLog bonus : page.getRecords()) {
                if (bonusDao.bindSettlementIfUnsettled(bonus.getId(), settlement.getId()) != 1) {
                    throw new BusinessException("结算奖金归集发生并发冲突，请重试");
                }
                bonus.setSettlementId(settlement.getId());
            }
            created.add(settlement);
        }
        return created;
    }

    @Override
    @Transactional
    public PromotionAgentSettlement confirm(String settlementNo, Long operatorId) {
        PromotionAgentSettlement settlement = settlementDao.selectBySettlementNoForUpdate(settlementNo);
        if (settlement == null) {
            throw new BusinessException(404, "结算单不存在");
        }
        if (!PromotionSettlementStatusEnum.PENDING_CONFIRM.getCode().equals(settlement.getStatus())) {
            throw new BusinessException(409, "结算单已确定，不能重复操作");
        }
        LocalDateTime confirmedAt = LocalDateTime.now();
        if (settlementDao.confirmIfPending(settlement.getId(), operatorId, confirmedAt) != 1) {
            throw new BusinessException(409, "结算单已确定，不能重复操作");
        }
        settlement.setStatus(PromotionSettlementStatusEnum.CONFIRMED.getCode());
        settlement.setConfirmedBy(operatorId);
        settlement.setConfirmedTime(confirmedAt);

        PromotionAgentStat stat = statDao.selectByAgentIdForUpdate(settlement.getAgentId());
        if (stat != null) {
            BigDecimal amount = settlement.getPayableAmount();
            stat.setConfirmedBonusAmount(zero(stat.getConfirmedBonusAmount()).add(amount));
            stat.setPendingBonusAmount(zero(stat.getPendingBonusAmount()).subtract(amount).max(BigDecimal.ZERO));
            stat.setLastSettlementTime(LocalDateTime.now());
            stat.setStatVersion((stat.getStatVersion() == null ? 0 : stat.getStatVersion()) + 1);
            statDao.updateById(stat);
        }
        return settlement;
    }

    private BigDecimal zero(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }
}

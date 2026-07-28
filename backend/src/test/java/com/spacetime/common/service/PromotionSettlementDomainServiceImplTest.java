package com.spacetime.common.service;

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
import com.spacetime.common.service.impl.PromotionSettlementDomainServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 校园推广员自然月结算和确认测试。
 */
class PromotionSettlementDomainServiceImplTest {
    private PromotionAgentDao agentDao;
    private PromotionAgentBonusLogDao bonusDao;
    private PromotionAgentSettlementDao settlementDao;
    private PromotionAgentStatDao statDao;
    private PromotionSettlementDomainServiceImpl service;
    private PromotionEventInboxDao inboxDao;

    @BeforeEach
    void setUp() {
        agentDao = mock(PromotionAgentDao.class);
        bonusDao = mock(PromotionAgentBonusLogDao.class);
        settlementDao = mock(PromotionAgentSettlementDao.class);
        statDao = mock(PromotionAgentStatDao.class);
        inboxDao = mock(PromotionEventInboxDao.class);
        Page<com.spacetime.common.entity.PromotionEventInbox> emptyInbox = new Page<>(1, 1);
        emptyInbox.setRecords(List.of());
        when(inboxDao.selectPage(any(), any())).thenReturn(emptyInbox);
        when(bonusDao.bindSettlementIfUnsettled(any(), any())).thenReturn(1);
        service = new PromotionSettlementDomainServiceImpl(agentDao, bonusDao, settlementDao, statDao, inboxDao);
    }

    @Test
    void 上月奖金生成一张待确认结算并归集明细() {
        PromotionAgent agent = new PromotionAgent();
        agent.setId(9L);
        Page<PromotionAgent> agentPage = new Page<>(1, 100);
        agentPage.setRecords(List.of(agent));
        when(agentDao.selectPage(any(), any())).thenReturn(agentPage);
        PromotionAgentBonusLog first = bonus(1L, "20.00");
        PromotionAgentBonusLog second = bonus(2L, "50.00");
        Page<PromotionAgentBonusLog> bonusPage = new Page<>(1, 10000);
        bonusPage.setRecords(List.of(first, second));
        when(bonusDao.selectPage(any(), any())).thenReturn(bonusPage);
        doAnswer(invocation -> {
            PromotionAgentSettlement settlement = invocation.getArgument(0);
            settlement.setId(100L);
            return null;
        }).when(settlementDao).insert(any());

        List<PromotionAgentSettlement> result = service.generate(YearMonth.of(2026, 6));

        assertThat(result).singleElement()
                .extracting(PromotionAgentSettlement::getPayableAmount)
                .isEqualTo(new BigDecimal("70.00"));
        assertThat(result.get(0).getStatus()).isEqualTo("pending_confirm");
        assertThat(first.getSettlementId()).isEqualTo(100L);
        assertThat(second.getSettlementId()).isEqualTo(100L);
        verify(bonusDao, org.mockito.Mockito.times(2)).bindSettlementIfUnsettled(any(), any());
    }

    @Test
    void 同代理同月已存在时任务重跑不新建() {
        PromotionAgent agent = new PromotionAgent();
        agent.setId(9L);
        Page<PromotionAgent> agentPage = new Page<>(1, 100);
        agentPage.setRecords(List.of(agent));
        when(agentDao.selectPage(any(), any())).thenReturn(agentPage);
        when(settlementDao.selectByAgentIdAndMonth(9L, YearMonth.of(2026, 6).atDay(1)))
                .thenReturn(new PromotionAgentSettlement());

        assertThat(service.generate(YearMonth.of(2026, 6))).isEmpty();
        verify(settlementDao, never()).insert(any());
    }

    @Test
    void 确定结算更新两态并刷新代理已发和待结算() {
        PromotionAgentSettlement settlement = new PromotionAgentSettlement();
        settlement.setAgentId(9L);
        settlement.setStatus("pending_confirm");
        settlement.setPayableAmount(new BigDecimal("70.00"));
        settlement.setId(1L);
        when(settlementDao.selectBySettlementNoForUpdate("STL-1")).thenReturn(settlement);
        when(settlementDao.confirmIfPending(any(), any(), any())).thenReturn(1);
        PromotionAgentStat stat = new PromotionAgentStat();
        stat.setConfirmedBonusAmount(new BigDecimal("10.00"));
        stat.setPendingBonusAmount(new BigDecimal("100.00"));
        when(statDao.selectByAgentIdForUpdate(9L)).thenReturn(stat);

        PromotionAgentSettlement result = service.confirm("STL-1", 7L);

        assertThat(result.getStatus()).isEqualTo("confirmed");
        assertThat(result.getConfirmedBy()).isEqualTo(7L);
        assertThat(stat.getConfirmedBonusAmount()).isEqualByComparingTo("80.00");
        assertThat(stat.getPendingBonusAmount()).isEqualByComparingTo("30.00");
        verify(statDao).updateById(stat);
    }

    private PromotionAgentBonusLog bonus(Long id, String amount) {
        PromotionAgentBonusLog log = new PromotionAgentBonusLog();
        log.setId(id);
        log.setAgentId(9L);
        log.setAmount(new BigDecimal(amount));
        return log;
    }
}

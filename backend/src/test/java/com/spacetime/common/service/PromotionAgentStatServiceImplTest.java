package com.spacetime.common.service;

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
import com.spacetime.common.service.impl.PromotionAgentStatServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionAgentStatServiceImpl L3 测试")
class PromotionAgentStatServiceImplTest {
    @Mock
    private PromotionAgentStatDao statDao;
    @Mock
    private PromotionAgentDao agentDao;
    @Mock
    private PromotionAgentEventDao eventDao;
    @Mock
    private PromotionAgentBonusLogDao bonusLogDao;
    @Mock
    private PromotionAgentSettlementDao settlementDao;

    @InjectMocks
    private PromotionAgentStatServiceImpl service;

    @Test
    @DisplayName("L3-24 新增代理初始化统计行")
    void initAgentStat_shouldInsertEmptyStat() {
        PromotionAgent agent = new PromotionAgent();
        agent.setId(9L);
        agent.setAgentNo("AGT-1");
        when(statDao.selectByAgentId(9L)).thenReturn(null);

        service.initAgentStat(agent);

        verify(statDao).insert(any(PromotionAgentStat.class));
    }

    @Test
    @DisplayName("L3-25 统计重算聚合事件、奖金和结算状态")
    void rebuild_shouldAggregateFacts() {
        PromotionAgent agent = new PromotionAgent();
        agent.setId(9L);
        agent.setAgentNo("AGT-1");
        PromotionAgentStat stat = new PromotionAgentStat();
        stat.setAgentId(9L);
        stat.setStatVersion(1);
        when(agentDao.selectById(9L)).thenReturn(agent);
        when(statDao.selectByAgentId(9L)).thenReturn(stat);
        when(eventDao.selectPage(any(), any())).thenReturn(page(List.of(
                event("click"),
                event("register_login_reward"),
                event("profile_complete_reward"),
                event("verify_complete_reward"),
                event("first_vip_reward"),
                event("first_coin_recharge_reward"))));
        when(bonusLogDao.selectPage(any(), any())).thenReturn(page(List.of(
                bonus("pending_settlement", "10.00"),
                bonus("confirmed", "20.00"),
                bonus("paid", "30.00"),
                bonus("cancelled", "40.00"))));
        when(settlementDao.selectPage(any(), any())).thenReturn(page(List.of(
                settlement("confirmed"),
                settlement("paid"))));

        PromotionAgentStat result = service.rebuildAgentStat(9L);

        assertThat(result.getClickCnt()).isEqualTo(1);
        assertThat(result.getRegisterCnt()).isEqualTo(1);
        assertThat(result.getProfileCnt()).isEqualTo(1);
        assertThat(result.getVerifyCnt()).isEqualTo(1);
        assertThat(result.getSuccessCnt()).isEqualTo(1);
        assertThat(result.getFirstVipCnt()).isEqualTo(1);
        assertThat(result.getFirstCoinRechargeCnt()).isEqualTo(1);
        assertThat(result.getBonusDueAmount()).isEqualByComparingTo("60.00");
        assertThat(result.getBonusPendingAmount()).isEqualByComparingTo("10.00");
        assertThat(result.getBonusConfirmedAmount()).isEqualByComparingTo("20.00");
        assertThat(result.getBonusPaidAmount()).isEqualByComparingTo("30.00");
        assertThat(result.getStatVersion()).isEqualTo(2);
        verify(statDao).updateById(stat);
    }

    private <T> Page<T> page(List<T> rows) {
        Page<T> page = new Page<>(1, 100, rows.size());
        page.setRecords(rows);
        return page;
    }

    private PromotionAgentEvent event(String type) {
        PromotionAgentEvent event = new PromotionAgentEvent();
        event.setEventType(type);
        event.setEventTime(LocalDateTime.now());
        return event;
    }

    private PromotionAgentBonusLog bonus(String status, String amount) {
        PromotionAgentBonusLog log = new PromotionAgentBonusLog();
        log.setStatus(status);
        log.setBonusAmount(new BigDecimal(amount));
        return log;
    }

    private PromotionAgentSettlement settlement(String status) {
        PromotionAgentSettlement settlement = new PromotionAgentSettlement();
        settlement.setStatus(status);
        settlement.setConfirmTime(LocalDateTime.now());
        settlement.setPaidTime(LocalDateTime.now().plusMinutes(1));
        return settlement;
    }
}

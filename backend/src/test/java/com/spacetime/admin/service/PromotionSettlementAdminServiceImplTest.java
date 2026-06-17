package com.spacetime.admin.service;

import com.spacetime.admin.service.impl.PromotionSettlementAdminServiceImpl;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentSettlementDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.entity.PromotionAgentSettlement;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionAgentStatService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionSettlementAdminServiceImpl L3 测试")
class PromotionSettlementAdminServiceImplTest {

    @Mock
    private PromotionAgentSettlementDao settlementDao;
    @Mock
    private PromotionAuditLogDao auditLogDao;
    @Mock
    private PromotionAgentDao agentDao;
    @Mock
    private PromotionAgentStatService agentStatService;

    @InjectMocks
    private PromotionSettlementAdminServiceImpl service;

    @Test
    @DisplayName("F3-P0-09 unsettled 可以确认")
    void confirmUnsettled_shouldConfirmed() {
        PromotionAgentSettlement settlement = settlement(1L, "unsettled");
        when(settlementDao.selectById(1L)).thenReturn(settlement);

        service.confirm(1L, "财务确认");

        assertThat(settlement.getStatus()).isEqualTo("confirmed");
        assertThat(settlement.getConfirmTime()).isNotNull();
        verify(settlementDao).updateById(settlement);
        verify(agentStatService).safeRefreshBySettlement(1L);
    }

    @Test
    @DisplayName("F3-P0-10 confirmed 可以发放")
    void paidConfirmed_shouldPaid() {
        PromotionAgentSettlement settlement = settlement(1L, "confirmed");
        when(settlementDao.selectById(1L)).thenReturn(settlement);

        service.paid(1L, new BigDecimal("88.00"), "已转账");

        assertThat(settlement.getStatus()).isEqualTo("paid");
        assertThat(settlement.getPaidAmount()).isEqualByComparingTo("88.00");
        assertThat(settlement.getPaidTime()).isNotNull();
    }

    @Test
    @DisplayName("F3-P2-02 unsettled 不能直接发放")
    void paidUnsettled_shouldReject() {
        when(settlementDao.selectById(1L)).thenReturn(settlement(1L, "unsettled"));

        assertThatThrownBy(() -> service.paid(1L, BigDecimal.TEN, "直接发"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("只有已确认结算单可以标记发放");
    }

    private PromotionAgentSettlement settlement(Long id, String status) {
        PromotionAgentSettlement settlement = new PromotionAgentSettlement();
        settlement.setId(id);
        settlement.setSettlementNo("ST1");
        settlement.setAgentId(1L);
        settlement.setStatus(status);
        settlement.setPayableAmount(new BigDecimal("100.00"));
        settlement.setPaidAmount(BigDecimal.ZERO);
        return settlement;
    }
}

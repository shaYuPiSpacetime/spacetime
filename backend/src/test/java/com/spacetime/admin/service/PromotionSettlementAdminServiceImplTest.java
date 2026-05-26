package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.PromotionSettlementCreateReq;
import com.spacetime.admin.service.impl.PromotionSettlementAdminServiceImpl;
import com.spacetime.common.dao.PromotionAgentSettlementDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.entity.PromotionAgentSettlement;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionSettlementAdminServiceImpl L3 测试")
class PromotionSettlementAdminServiceImplTest {

    @Mock
    private PromotionAgentSettlementDao settlementDao;
    @Mock
    private PromotionAuditLogDao auditLogDao;

    @InjectMocks
    private PromotionSettlementAdminServiceImpl service;

    @Test
    @DisplayName("F3-P0-08 生成结算单默认 pending")
    void createSettlement_shouldPending() {
        PromotionSettlementCreateReq req = createReq();

        service.create(req);

        verify(settlementDao).insert(argThat(settlement ->
                settlement.getSettlementNo().startsWith("ST")
                        && "pending".equals(settlement.getStatus())
                        && BigDecimal.ZERO.compareTo(settlement.getPaidAmount()) == 0));
        verify(auditLogDao).insert(any());
    }

    @Test
    @DisplayName("L2-10/F3 结算开始日期不能晚于结束日期")
    void createSettlement_invalidPeriod_shouldReject() {
        PromotionSettlementCreateReq req = createReq();
        req.setPeriodStart(LocalDate.of(2026, 5, 2));
        req.setPeriodEnd(LocalDate.of(2026, 5, 1));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("结算开始日期不能晚于结束日期");
    }

    @Test
    @DisplayName("F3-P0-09 pending 可以确认")
    void confirmPending_shouldConfirmed() {
        PromotionAgentSettlement settlement = settlement(1L, "pending");
        when(settlementDao.selectById(1L)).thenReturn(settlement);

        service.confirm(1L, "财务确认");

        assertThat(settlement.getStatus()).isEqualTo("confirmed");
        assertThat(settlement.getConfirmTime()).isNotNull();
        verify(settlementDao).updateById(settlement);
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
    @DisplayName("F3-P2-02 pending 不能直接发放")
    void paidPending_shouldReject() {
        when(settlementDao.selectById(1L)).thenReturn(settlement(1L, "pending"));

        assertThatThrownBy(() -> service.paid(1L, BigDecimal.TEN, "直接发"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("只有已确认结算单可以标记发放");
    }

    private PromotionSettlementCreateReq createReq() {
        PromotionSettlementCreateReq req = new PromotionSettlementCreateReq();
        req.setAgentId(1L);
        req.setPeriodStart(LocalDate.of(2026, 5, 1));
        req.setPeriodEnd(LocalDate.of(2026, 5, 31));
        req.setPayableAmount(new BigDecimal("100.00"));
        return req;
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

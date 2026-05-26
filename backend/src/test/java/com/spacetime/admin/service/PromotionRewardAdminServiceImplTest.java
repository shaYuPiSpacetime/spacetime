package com.spacetime.admin.service;

import com.spacetime.admin.service.impl.PromotionRewardAdminServiceImpl;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionRewardAdminServiceImpl L3 测试")
class PromotionRewardAdminServiceImplTest {

    @Mock
    private PromotionRewardLogDao rewardLogDao;
    @Mock
    private PromotionAuditLogDao auditLogDao;

    @InjectMocks
    private PromotionRewardAdminServiceImpl service;

    @Test
    @DisplayName("F3-P0-03/L3-12 冻结奖励确认有效后置为 success")
    void approveFrozen_shouldSuccessAndAudit() {
        PromotionRewardLog log = reward(1L, "frozen");
        when(rewardLogDao.selectById(1L)).thenReturn(log);

        service.approve(1L, "人工确认有效");

        assertThat(log.getStatus()).isEqualTo("success");
        assertThat(log.getArriveTime()).isNotNull();
        assertThat(log.getReviewTime()).isNotNull();
        verify(rewardLogDao).updateById(log);
        verify(auditLogDao).insert(argThat(audit -> "approve".equals(audit.getAction())));
    }

    @Test
    @DisplayName("F3-P0-04/L3-13 冻结奖励驳回后置为 invalid")
    void rejectFrozen_shouldInvalidAndAudit() {
        PromotionRewardLog log = reward(1L, "frozen");
        when(rewardLogDao.selectById(1L)).thenReturn(log);

        service.reject(1L, "刷量");

        assertThat(log.getStatus()).isEqualTo("invalid");
        assertThat(log.getArriveTime()).isNull();
        verify(rewardLogDao).updateById(log);
        verify(auditLogDao).insert(argThat(audit -> "reject".equals(audit.getAction())));
    }

    @Test
    @DisplayName("F3-P2-03 非 frozen 奖励不能复核")
    void approveSuccessReward_shouldReject() {
        when(rewardLogDao.selectById(1L)).thenReturn(reward(1L, "success"));

        assertThatThrownBy(() -> service.approve(1L, "重复处理"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("只有冻结中的奖励可以复核");

        verify(rewardLogDao, never()).updateById(any());
    }

    private PromotionRewardLog reward(Long id, String status) {
        PromotionRewardLog log = new PromotionRewardLog();
        log.setId(id);
        log.setRewardNo("RW1");
        log.setRelationId(10L);
        log.setInviterId(100L);
        log.setInviteeId(200L);
        log.setEventType("verify_complete_reward");
        log.setRewardCoin(BigDecimal.TEN);
        log.setStatus(status);
        return log;
    }
}

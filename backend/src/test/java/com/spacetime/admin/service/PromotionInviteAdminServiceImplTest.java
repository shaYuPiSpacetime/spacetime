package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.service.impl.PromotionInviteAdminServiceImpl;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionInviteAdminServiceImpl L3 测试")
class PromotionInviteAdminServiceImplTest {
    @Mock
    private PromotionInviteRelationDao relationDao;
    @Mock
    private UserDao userDao;
    @Mock
    private PromotionAgentDao agentDao;
    @Mock
    private PromotionRewardLogDao rewardLogDao;
    @Mock
    private PromotionAuditLogDao auditLogDao;

    @InjectMocks
    private PromotionInviteAdminServiceImpl service;

    @Test
    @DisplayName("L3-22 邀请关系解除冻结恢复冻结前状态并恢复冻结奖励")
    void unfreeze_shouldRestoreRelationAndRewards() {
        PromotionInviteRelation relation = relation("frozen");
        relation.setFrozenBeforeStatus("verify_success");
        PromotionRewardLog reward = reward("frozen");
        Page<PromotionRewardLog> page = new Page<>(1, 500, 1);
        page.setRecords(List.of(reward));
        when(relationDao.selectById(1L)).thenReturn(relation);
        when(rewardLogDao.selectPage(any(), any())).thenReturn(page);

        service.unfreeze(1L, "人工通过");

        assertThat(relation.getStatus()).isEqualTo("verify_success");
        assertThat(reward.getStatus()).isEqualTo("pending");
        assertThat(reward.getReviewRemark()).isEqualTo("人工通过");
        verify(relationDao).updateById(relation);
        verify(rewardLogDao).updateById(reward);
        verify(auditLogDao).insert(argThat(log -> "unfreeze".equals(log.getAction())));
    }

    @Test
    @DisplayName("L3-23 非冻结关系不能解除冻结")
    void unfreeze_nonFrozen_shouldReject() {
        when(relationDao.selectById(1L)).thenReturn(relation("registered"));

        assertThatThrownBy(() -> service.unfreeze(1L, "误操作"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("只有冻结中的邀请关系可以解除冻结");
    }

    @Test
    @DisplayName("L3-24 邀请关系人工判无效会联动奖励无效")
    void markInvalid_shouldInvalidateRewards() {
        PromotionInviteRelation relation = relation("registered");
        PromotionRewardLog reward = reward("success");
        Page<PromotionRewardLog> page = new Page<>(1, 500, 1);
        page.setRecords(List.of(reward));
        when(relationDao.selectById(1L)).thenReturn(relation);
        when(rewardLogDao.selectPage(any(), any())).thenReturn(page);

        service.markInvalid(1L, "自邀请");

        assertThat(relation.getStatus()).isEqualTo("invalid");
        assertThat(relation.getInvalidReason()).isEqualTo("自邀请");
        assertThat(reward.getStatus()).isEqualTo("invalid");
        assertThat(reward.getReviewRemark()).isEqualTo("自邀请");
        verify(auditLogDao).insert(argThat(log -> "invalid".equals(log.getAction())));
    }

    private PromotionInviteRelation relation(String status) {
        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setId(1L);
        relation.setStatus(status);
        return relation;
    }

    private PromotionRewardLog reward(String status) {
        PromotionRewardLog reward = new PromotionRewardLog();
        reward.setId(2L);
        reward.setRelationId(1L);
        reward.setStatus(status);
        return reward;
    }
}

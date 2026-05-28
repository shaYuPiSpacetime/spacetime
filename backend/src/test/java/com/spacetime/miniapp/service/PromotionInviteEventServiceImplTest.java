package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.dao.PromotionRuleDao;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.entity.PromotionRule;
import com.spacetime.miniapp.service.impl.PromotionInviteEventServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionInviteEventServiceImpl L3 测试")
class PromotionInviteEventServiceImplTest {
    @Mock
    private PromotionInviteService promotionInviteService;
    @Mock
    private PromotionInviteRelationDao relationDao;
    @Mock
    private PromotionRuleDao ruleDao;
    @Mock
    private PromotionRewardLogDao rewardLogDao;

    @InjectMocks
    private PromotionInviteEventServiceImpl service;

    @Test
    @DisplayName("注册事件基于已有邀请关系生成奖励流水")
    void handleRegisterEvent_shouldGenerateReward() {
        PromotionInviteRelation relation = relation();
        PromotionRule rule = new PromotionRule();
        rule.setRewardAmount(new BigDecimal("12"));
        Page<PromotionRule> page = new Page<>(1, 1);
        page.setRecords(List.of(rule));
        when(relationDao.selectByInviteeId(200L)).thenReturn(relation);
        when(ruleDao.selectPage(any(), any())).thenReturn(page);

        PromotionInviteRelation result = service.handleInviteEvent(200L, "register_login_reward");

        assertThat(result).isSameAs(relation);
        verify(rewardLogDao).insert(argThat(log ->
                log.getRelationId().equals(1L)
                        && log.getInviterId().equals(100L)
                        && log.getInviteeId().equals(200L)
                        && log.getRewardCoin().compareTo(new BigDecimal("12")) == 0
                        && "pending".equals(log.getStatus())));
    }

    @Test
    @DisplayName("资料完善事件推进关系并生成奖励流水")
    void handleProfileEvent_shouldAdvanceRelationAndGenerateReward() {
        PromotionInviteRelation relation = relation();
        when(promotionInviteService.markProfileCompleted(200L)).thenReturn(relation);
        when(ruleDao.selectPage(any(), any())).thenReturn(new Page<>(1, 1));

        service.handleInviteEvent(200L, "profile_complete_reward");

        verify(promotionInviteService).markProfileCompleted(200L);
        verify(rewardLogDao).insert(argThat(log ->
                "profile_complete_reward".equals(log.getEventType())
                        && log.getRewardCoin().compareTo(new BigDecimal("20")) == 0));
    }

    @Test
    @DisplayName("重复事件不重复生成奖励流水")
    void handleDuplicateEvent_shouldNotGenerateAgain() {
        PromotionInviteRelation relation = relation();
        when(relationDao.selectByInviteeId(200L)).thenReturn(relation);
        when(rewardLogDao.selectByRelationIdAndEventType(1L, "register_login_reward")).thenReturn(new PromotionRewardLog());

        service.handleInviteEvent(200L, "register_login_reward");

        verify(rewardLogDao, never()).insert(any());
    }

    @Test
    @DisplayName("校园代理来源不生成普通邀请奖励")
    void handleAgentRelation_shouldSkipUserReward() {
        PromotionInviteRelation relation = relation();
        relation.setInviterId(null);
        relation.setAgentId(9L);
        when(relationDao.selectByInviteeId(200L)).thenReturn(relation);

        service.handleInviteEvent(200L, "register_login_reward");

        verify(rewardLogDao, never()).insert(any());
    }

    private PromotionInviteRelation relation() {
        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setId(1L);
        relation.setInviterId(100L);
        relation.setInviteeId(200L);
        relation.setStatus("registered");
        return relation;
    }
}

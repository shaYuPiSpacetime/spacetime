package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.PromotionRelationItemVO;
import com.spacetime.admin.service.impl.PromotionAdminServiceImpl;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.PromotionAgentBonusLogDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentBonusLog;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionAdminServiceImplTest {
    @Mock private PromotionInviteRelationDao relationDao;
    @Mock private AppUserDao appUserDao;
    @Mock private PromotionAgentDao agentDao;
    @Mock private PromotionRewardLogDao rewardDao;
    @Mock private PromotionAgentBonusLogDao bonusDao;
    @InjectMocks private PromotionAdminServiceImpl service;

    @Test
    void normalRelationWithoutAgentReturnsRewardsAndOnlySumsSuccess() {
        PromotionInviteRelation relation = normalRelation();
        stubRelation(relation);
        when(rewardDao.selectPage(any(), any())).thenReturn(page(List.of(
                reward("IRW-success", PromotionRewardStatusEnum.SUCCESS.getCode(), "19"),
                reward("IRW-failed", PromotionRewardStatusEnum.FAILED.getCode(), "50"))));
        when(bonusDao.selectPage(any(), any())).thenReturn(page(List.of()));

        PromotionRelationItemVO detail = service.relationDetail(relation.getRelationNo());

        assertThat(detail.getSourceObjectName()).isEqualTo("邀请人");
        assertThat(detail.getInviteeNickname()).isEqualTo("被邀请人");
        assertThat(detail.getRegisteredAt()).isEqualTo(relation.getRegisteredAt());
        assertThat(detail.getRewardItems()).extracting("rewardNo").containsExactly("IRW-success", "IRW-failed");
        assertThat(detail.getRewardItems()).allSatisfy(item -> {
            assertThat(item.getRelationNo()).isEqualTo(relation.getRelationNo());
            assertThat(item.getRewardObjectName()).isEqualTo("邀请人");
            assertThat(item.getAmountUnit()).isEqualTo("coin");
        });
        assertThat(detail.getPaidRewardTotal()).isEqualByComparingTo("19");
        verifyNoInteractions(agentDao);
    }

    @Test
    void normalRelationWithoutRewardsReturnsEmptyList() {
        PromotionInviteRelation relation = normalRelation();
        stubRelation(relation);
        when(rewardDao.selectPage(any(), any())).thenReturn(page(List.of()));
        when(bonusDao.selectPage(any(), any())).thenReturn(page(List.of()));

        PromotionRelationItemVO detail = service.relationDetail(relation.getRelationNo());

        assertThat(detail.getRewardItems()).isEmpty();
        assertThat(detail.getPaidRewardTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        verifyNoInteractions(agentDao);
    }

    @Test
    void campusRelationKeepsAgentAndCashBonus() {
        PromotionInviteRelation relation = normalRelation();
        relation.setSourceType("campus_agent");
        relation.setInviterId(null);
        relation.setAgentId(9L);
        stubRelation(relation);
        PromotionAgent agent = new PromotionAgent();
        agent.setId(9L);
        agent.setAgentNo("AGT-9");
        agent.setAgentName("校园推广员");
        when(agentDao.selectPage(any(), any())).thenReturn(page(List.of(agent)));
        PromotionAgentBonusLog bonus = new PromotionAgentBonusLog();
        bonus.setRelationId(relation.getId());
        bonus.setBonusNo("ABN-1");
        bonus.setAmount(new BigDecimal("10.00"));
        when(rewardDao.selectPage(any(), any())).thenReturn(page(List.of()));
        when(bonusDao.selectPage(any(), any())).thenReturn(page(List.of(bonus)));

        PromotionRelationItemVO detail = service.relationDetail(relation.getRelationNo());

        assertThat(detail.getSourceObjectNo()).isEqualTo("AGT-9");
        assertThat(detail.getSourceObjectName()).isEqualTo("校园推广员");
        assertThat(detail.getRewardItems()).singleElement().satisfies(item -> {
            assertThat(item.getRewardObjectName()).isEqualTo("校园推广员");
            assertThat(item.getAmountUnit()).isEqualTo("cny");
        });
        assertThat(detail.getPaidRewardTotal()).isEqualByComparingTo("10.00");
    }

    @Test
    void missingRelationReturnsBusinessNotFound() {
        assertThatThrownBy(() -> service.relationDetail("REL-missing"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("邀请关系不存在")
                .extracting("code").isEqualTo(404);
        verifyNoInteractions(appUserDao, agentDao, rewardDao, bonusDao);
    }

    private void stubRelation(PromotionInviteRelation relation) {
        when(relationDao.selectByRelationNo(relation.getRelationNo())).thenReturn(relation);
        AppUser inviter = new AppUser();
        inviter.setId(117L);
        inviter.setNickname("邀请人");
        AppUser invitee = new AppUser();
        invitee.setId(118L);
        invitee.setNickname("被邀请人");
        when(appUserDao.selectList(any())).thenReturn(List.of(inviter, invitee));
    }

    private PromotionInviteRelation normalRelation() {
        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setId(1L);
        relation.setRelationNo("REL-1");
        relation.setSourceType("normal_user");
        relation.setInviterId(117L);
        relation.setInviteeId(118L);
        relation.setRegisteredAt(LocalDateTime.of(2026, 9, 1, 12, 0));
        return relation;
    }

    private PromotionRewardLog reward(String rewardNo, String status, String amount) {
        PromotionRewardLog reward = new PromotionRewardLog();
        reward.setRelationId(1L);
        reward.setRewardNo(rewardNo);
        reward.setStatus(status);
        reward.setAmount(new BigDecimal(amount));
        return reward;
    }

    private <T> Page<T> page(List<T> records) {
        Page<T> page = new Page<>(1, 100, records.size());
        page.setRecords(records);
        return page;
    }
}

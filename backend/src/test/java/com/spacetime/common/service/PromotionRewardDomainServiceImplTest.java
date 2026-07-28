package com.spacetime.common.service;

import com.spacetime.common.dao.PromotionInviteCounterDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionInviteCounter;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.service.impl.PromotionRewardDomainServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 普通邀请基础奖励和阶梯精确命中测试。
 */
class PromotionRewardDomainServiceImplTest {
    private PromotionRewardLogDao rewardDao;
    private PromotionInviteCounterDao counterDao;
    private PromotionRewardDomainServiceImpl service;

    @BeforeEach
    void setUp() {
        rewardDao = mock(PromotionRewardLogDao.class);
        counterDao = mock(PromotionInviteCounterDao.class);
        service = new PromotionRewardDomainServiceImpl(rewardDao, counterDao);
        doAnswer(invocation -> {
            PromotionRewardLog reward = invocation.getArgument(0);
            reward.setId((long) reward.getRewardNo().hashCode());
            return null;
        }).when(rewardDao).insert(any());
    }

    @Test
    void 第五人同时生成注册和阶梯两笔独立奖励() {
        PromotionInviteCounter counter = new PromotionInviteCounter();
        counter.setId(7L);
        counter.setSuccessCount(4);
        when(counterDao.selectForUpdate("normal_user", 11L)).thenReturn(counter);
        PromotionInviteRelation relation = relation(55L, 11L);

        List<PromotionRewardLog> rewards = service.createForEvent(
                relation,
                "register_reward",
                rule(),
                LocalDateTime.now());

        assertThat(rewards).hasSize(2);
        assertThat(rewards).extracting(PromotionRewardLog::getEventType)
                .containsExactly("register_reward", "ladder_bonus");
        assertThat(rewards.get(1).getLadderThreshold()).isEqualTo(5);
        assertThat(rewards).extracting(PromotionRewardLog::getAmount)
                .containsExactly(new BigDecimal("20"), new BigDecimal("50"));
        verify(counterDao).increment(7L);
    }

    @Test
    void 第八人只生成基础奖励() {
        PromotionInviteCounter counter = new PromotionInviteCounter();
        counter.setId(7L);
        counter.setSuccessCount(7);
        when(counterDao.selectForUpdate("normal_user", 11L)).thenReturn(counter);

        List<PromotionRewardLog> rewards = service.createForEvent(
                relation(55L, 11L),
                "register_reward",
                rule(),
                LocalDateTime.now());

        assertThat(rewards).singleElement()
                .extracting(PromotionRewardLog::getEventType)
                .isEqualTo("register_reward");
    }

    @Test
    void 重放时复用已有幂等奖励不新增() {
        PromotionRewardLog existing = new PromotionRewardLog();
        existing.setRewardNo("IRW-old");
        when(rewardDao.selectByIdempotencyKey("normal:55:register_reward"))
                .thenReturn(existing);

        List<PromotionRewardLog> rewards = service.createForEvent(
                relation(55L, 11L),
                "register_reward",
                rule(),
                LocalDateTime.now());

        assertThat(rewards).containsExactly(existing);
        org.mockito.Mockito.verify(rewardDao, org.mockito.Mockito.never()).insert(any());
    }

    private PromotionInviteRelation relation(Long id, Long inviterId) {
        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setId(id);
        relation.setInviterId(inviterId);
        relation.setInviteeId(99L);
        relation.setSourceType("normal_user");
        return relation;
    }

    private PromotionRuleSnapshot rule() {
        return new PromotionRuleSnapshot(
                10L,
                "normal_user",
                "ladder",
                2,
                List.of(new PromotionRuleEventSnapshot(
                        "register_reward", "完成注册", true, new BigDecimal("20"))),
                List.of(
                        new PromotionRuleTierSnapshot(5, new BigDecimal("50"), true),
                        new PromotionRuleTierSnapshot(10, new BigDecimal("100"), true)),
                LocalDateTime.now());
    }
}

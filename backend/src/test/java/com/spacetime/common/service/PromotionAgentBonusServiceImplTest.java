package com.spacetime.common.service;

import com.spacetime.common.dao.PromotionAgentBonusLogDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentStatDao;
import com.spacetime.common.dao.PromotionInviteCounterDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentBonusLog;
import com.spacetime.common.entity.PromotionInviteCounter;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.service.impl.PromotionAgentBonusServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 校园推广员基础和阶梯奖金测试。
 */
class PromotionAgentBonusServiceImplTest {
    private PromotionAgentDao agentDao;
    private PromotionAgentBonusLogDao bonusDao;
    private PromotionInviteCounterDao counterDao;
    private PromotionAgentStatDao statDao;
    private PromotionAgentBonusServiceImpl service;

    @BeforeEach
    void setUp() {
        agentDao = mock(PromotionAgentDao.class);
        bonusDao = mock(PromotionAgentBonusLogDao.class);
        counterDao = mock(PromotionInviteCounterDao.class);
        statDao = mock(PromotionAgentStatDao.class);
        service = new PromotionAgentBonusServiceImpl(agentDao, bonusDao, counterDao, statDao);
    }

    @Test
    void 启用代理第五人生成两条无状态奖金() {
        PromotionAgent agent = new PromotionAgent();
        agent.setId(9L);
        agent.setStatus("enabled");
        when(agentDao.selectById(9L)).thenReturn(agent);
        PromotionInviteCounter counter = new PromotionInviteCounter();
        counter.setId(1L);
        counter.setSuccessCount(4);
        when(counterDao.selectForUpdate("campus_agent", 9L)).thenReturn(counter);

        List<PromotionAgentBonusLog> result = service.createForEvent(
                relation(), "register_reward", rule(), LocalDateTime.now());

        assertThat(result).hasSize(2);
        assertThat(result).extracting(PromotionAgentBonusLog::getEventType)
                .containsExactly("register_reward", "ladder_bonus");
        assertThat(result.get(1).getLadderThreshold()).isEqualTo(5);
        assertThat(PromotionAgentBonusLog.class.getDeclaredFields())
                .extracting(java.lang.reflect.Field::getName)
                .doesNotContain("status");
    }

    @Test
    void 代理停用后既有关系也不再产生新奖金() {
        PromotionAgent agent = new PromotionAgent();
        agent.setStatus("disabled");
        when(agentDao.selectById(9L)).thenReturn(agent);

        assertThat(service.createForEvent(
                relation(), "profile_complete_reward", rule(), LocalDateTime.now()))
                .isEmpty();
    }

    private PromotionInviteRelation relation() {
        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setId(55L);
        relation.setAgentId(9L);
        relation.setInviteeId(99L);
        relation.setSourceType("campus_agent");
        return relation;
    }

    private PromotionRuleSnapshot rule() {
        return new PromotionRuleSnapshot(
                10L,
                "campus_agent",
                "ladder",
                2,
                List.of(
                        new PromotionRuleEventSnapshot("register_reward", "完成注册", true, new BigDecimal("20.00")),
                        new PromotionRuleEventSnapshot("profile_complete_reward", "完善资料", true, new BigDecimal("30.00"))),
                List.of(new PromotionRuleTierSnapshot(5, new BigDecimal("50.00"), true)),
                LocalDateTime.now());
    }
}

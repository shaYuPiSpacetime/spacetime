package com.spacetime.common.service;

import com.spacetime.common.dao.PromotionRuleCurrentDao;
import com.spacetime.common.dao.PromotionRuleDao;
import com.spacetime.common.dao.PromotionRuleEventDao;
import com.spacetime.common.dao.PromotionRuleTierDao;
import com.spacetime.common.entity.PromotionRule;
import com.spacetime.common.entity.PromotionRuleCurrent;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.model.promotion.PromotionRuleDraft;
import com.spacetime.common.model.promotion.PromotionRuleEventDraft;
import com.spacetime.common.model.promotion.PromotionRuleTierDraft;
import com.spacetime.common.service.impl.PromotionRuleDomainServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

/**
 * 不可变推广规则版本服务测试。
 */
class PromotionRuleDomainServiceImplTest {
    private PromotionRuleDao ruleDao;
    private PromotionRuleCurrentDao currentDao;
    private PromotionRuleEventDao eventDao;
    private PromotionRuleTierDao tierDao;
    private PromotionRuleDomainServiceImpl service;

    @BeforeEach
    void setUp() {
        ruleDao = mock(PromotionRuleDao.class);
        currentDao = mock(PromotionRuleCurrentDao.class);
        eventDao = mock(PromotionRuleEventDao.class);
        tierDao = mock(PromotionRuleTierDao.class);
        service = new PromotionRuleDomainServiceImpl(
                ruleDao, currentDao, eventDao, tierDao, new PromotionRuleValidator());
        doAnswer(invocation -> {
            PromotionRule rule = invocation.getArgument(0);
            rule.setId(101L);
            return null;
        }).when(ruleDao).insert(any());
    }

    @Test
    void 首次发布创建不可变版本与当前指针() {
        PromotionRuleSnapshot result = service.publish(draft(0));

        assertThat(result.version()).isEqualTo(1);
        assertThat(result.sourceType()).isEqualTo("normal_user");
        ArgumentCaptor<PromotionRuleCurrent> captor = ArgumentCaptor.forClass(PromotionRuleCurrent.class);
        verify(currentDao).insert(captor.capture());
        assertThat(captor.getValue().getRuleId()).isEqualTo(101L);
        assertThat(captor.getValue().getVersionNo()).isEqualTo(1);
        verify(eventDao, times(5)).insert(any());
        verify(tierDao).insert(any());
    }

    @Test
    void 旧expectedVersion拒绝覆盖新版本() {
        PromotionRuleCurrent current = new PromotionRuleCurrent();
        current.setVersionNo(2);
        current.setRuleId(88L);
        when(currentDao.selectBySourceTypeForUpdate("normal_user")).thenReturn(current);

        assertThatThrownBy(() -> service.publish(draft(1)))
                .hasMessageContaining("版本已更新");
    }

    @Test
    void 发布新版本只把旧头标记为superseded() {
        PromotionRuleCurrent current = new PromotionRuleCurrent();
        current.setVersionNo(1);
        current.setRuleId(88L);
        PromotionRule oldRule = new PromotionRule();
        oldRule.setId(88L);
        oldRule.setStatus("published");
        when(currentDao.selectBySourceTypeForUpdate("normal_user")).thenReturn(current);
        when(ruleDao.selectById(88L)).thenReturn(oldRule);

        PromotionRuleSnapshot result = service.publish(draft(1));

        assertThat(result.version()).isEqualTo(2);
        assertThat(oldRule.getStatus()).isEqualTo("superseded");
        verify(ruleDao).updateById(oldRule);
        verify(currentDao).updateById(current);
    }

    private PromotionRuleDraft draft(int expectedVersion) {
        return new PromotionRuleDraft(
                "normal_user",
                "ladder",
                expectedVersion,
                List.of(
                        new PromotionRuleEventDraft(
                                PromotionRewardEventEnum.REGISTER_REWARD.getCode(), true, new BigDecimal("20")),
                        new PromotionRuleEventDraft(
                                PromotionRewardEventEnum.PROFILE_COMPLETE_REWARD.getCode(), false, BigDecimal.ZERO),
                        new PromotionRuleEventDraft(
                                PromotionRewardEventEnum.VERIFY_COMPLETE_REWARD.getCode(), false, BigDecimal.ZERO),
                        new PromotionRuleEventDraft(
                                PromotionRewardEventEnum.FIRST_VIP_REWARD.getCode(), false, BigDecimal.ZERO),
                        new PromotionRuleEventDraft(
                                PromotionRewardEventEnum.FIRST_COIN_RECHARGE_REWARD.getCode(), false, BigDecimal.ZERO)),
                List.of(new PromotionRuleTierDraft(5, new BigDecimal("50"), true)));
    }
}

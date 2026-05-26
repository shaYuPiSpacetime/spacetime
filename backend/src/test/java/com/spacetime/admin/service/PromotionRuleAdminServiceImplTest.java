package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.PromotionRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionRuleTierReq;
import com.spacetime.admin.service.impl.PromotionRuleAdminServiceImpl;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionRuleDao;
import com.spacetime.common.dao.PromotionRuleTierDao;
import com.spacetime.common.entity.PromotionRule;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromotionRuleAdminServiceImpl L3 测试")
class PromotionRuleAdminServiceImplTest {

    @Mock
    private PromotionRuleDao ruleDao;
    @Mock
    private PromotionRuleTierDao tierDao;
    @Mock
    private PromotionAuditLogDao auditLogDao;

    @InjectMocks
    private PromotionRuleAdminServiceImpl service;

    @Test
    @DisplayName("F2-P2-01/L3 规则奖励金额不能为负数")
    void create_negativeReward_shouldReject() {
        PromotionRuleSaveReq req = validRuleReq();
        req.setRewardAmount(new BigDecimal("-1"));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("奖励金额不能为负数");

        verify(ruleDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3 规则生效时间不能晚于失效时间")
    void create_effectiveAfterExpire_shouldReject() {
        PromotionRuleSaveReq req = validRuleReq();
        req.setEffectiveTime(LocalDateTime.of(2026, 5, 2, 0, 0));
        req.setExpireTime(LocalDateTime.of(2026, 5, 1, 0, 0));

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("生效时间不能晚于失效时间");
    }

    @Test
    @DisplayName("F2-P2-02/L3 保存阶梯区间重叠应拒绝")
    void saveTiers_overlap_shouldReject() {
        when(ruleDao.selectById(1L)).thenReturn(rule(1L));

        PromotionRuleTierReq first = tier(1, 5, "10");
        PromotionRuleTierReq second = tier(5, 8, "12");

        assertThatThrownBy(() -> service.saveTiers(1L, List.of(first, second)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("阶梯区间不能重叠");

        verify(tierDao, never()).deleteByRuleId(any());
    }

    @Test
    @DisplayName("F2-P0-03/L3 保存合法阶梯会先删除后插入")
    void saveTiers_valid_shouldPersistAll() {
        when(ruleDao.selectById(1L)).thenReturn(rule(1L));

        service.saveTiers(1L, List.of(tier(0, 2, "5"), tier(3, 8, "10")));

        verify(tierDao).deleteByRuleId(1L);
        verify(tierDao, times(2)).insert(any());
        verify(auditLogDao).insert(any());
    }

    private PromotionRuleSaveReq validRuleReq() {
        PromotionRuleSaveReq req = new PromotionRuleSaveReq();
        req.setRuleName("注册登录奖励");
        req.setRuleType("user_invite");
        req.setEventType("register_login_reward");
        req.setRewardAmount(BigDecimal.TEN);
        req.setRewardUnit("coin");
        return req;
    }

    private PromotionRule rule(Long id) {
        PromotionRule rule = new PromotionRule();
        rule.setId(id);
        rule.setRuleName("阶梯奖励");
        return rule;
    }

    private PromotionRuleTierReq tier(int min, int max, String reward) {
        PromotionRuleTierReq req = new PromotionRuleTierReq();
        req.setMinCount(min);
        req.setMaxCount(max);
        req.setRewardAmount(new BigDecimal(reward));
        return req;
    }
}

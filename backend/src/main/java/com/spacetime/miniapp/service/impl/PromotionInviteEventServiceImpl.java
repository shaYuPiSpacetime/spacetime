package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.dao.PromotionRuleDao;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.entity.PromotionRule;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.PromotionInviteEventService;
import com.spacetime.miniapp.service.PromotionInviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 邀请业务事件统一入口实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionInviteEventServiceImpl implements PromotionInviteEventService {
    private final PromotionInviteService promotionInviteService;
    private final PromotionInviteRelationDao relationDao;
    private final PromotionRuleDao ruleDao;
    private final PromotionRewardLogDao rewardLogDao;

    @Override
    @Transactional
    public PromotionInviteRelation handleInviteEvent(Long inviteeId, String eventType) {
        PromotionInviteRelation relation = switch (eventType) {
            case "register_login_reward" -> requireRelationByInvitee(inviteeId);
            case "profile_complete_reward" -> promotionInviteService.markProfileCompleted(inviteeId);
            case "verify_complete_reward" -> promotionInviteService.markVerifySuccess(inviteeId);
            default -> throw new BusinessException("不支持的邀请事件");
        };
        generateRewardIfNeeded(relation, eventType);
        return relation;
    }

    private PromotionInviteRelation requireRelationByInvitee(Long inviteeId) {
        PromotionInviteRelation relation = relationDao.selectByInviteeId(inviteeId);
        if (relation == null) {
            throw new BusinessException("邀请关系不存在");
        }
        return relation;
    }

    private void generateRewardIfNeeded(PromotionInviteRelation relation, String eventType) {
        if (relation.getInviterId() == null) {
            return;
        }
        if (rewardLogDao.selectByRelationIdAndEventType(relation.getId(), eventType) != null) {
            return;
        }
        BigDecimal rewardAmount = rewardAmount(eventType);
        if (rewardAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        PromotionRewardLog log = new PromotionRewardLog();
        log.setRewardNo("RW" + IdUtil.getSnowflakeNextIdStr());
        log.setRelationId(relation.getId());
        log.setInviterId(relation.getInviterId());
        log.setInviteeId(relation.getInviteeId());
        log.setEventType(eventType);
        log.setRewardCoin(rewardAmount);
        log.setStatus("pending");
        rewardLogDao.insert(log);
    }

    private BigDecimal rewardAmount(String eventType) {
        Page<PromotionRule> page = ruleDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<PromotionRule>()
                        .eq(PromotionRule::getRuleType, "user_invite")
                        .eq(PromotionRule::getEventType, eventType)
                        .eq(PromotionRule::getStatus, "ENABLED")
                        .and(wrapper -> wrapper.isNull(PromotionRule::getEffectiveTime)
                                .or()
                                .le(PromotionRule::getEffectiveTime, LocalDateTime.now()))
                        .and(wrapper -> wrapper.isNull(PromotionRule::getExpireTime)
                                .or()
                                .ge(PromotionRule::getExpireTime, LocalDateTime.now()))
                        .orderByDesc(PromotionRule::getCreateTime));
        if (page.getRecords().isEmpty()) {
            return BigDecimal.ZERO;
        }
        PromotionRule rule = page.getRecords().get(0);
        return rule.getRewardAmount() == null ? BigDecimal.ZERO : rule.getRewardAmount();
    }
}

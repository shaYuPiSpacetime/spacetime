package com.spacetime.common.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.PromotionEventInboxDao;
import com.spacetime.common.entity.PromotionEventInbox;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.promotion.PromotionRegisterPayload;
import com.spacetime.common.service.PromotionEventInboxFailureService;
import com.spacetime.common.service.PromotionEventInboxService;
import com.spacetime.common.service.PromotionEventProcessor;
import com.spacetime.common.service.PromotionCoinGrantService;
import com.spacetime.common.service.PromotionRewardFailureService;
import com.spacetime.common.service.PromotionRuleDomainService;
import com.spacetime.common.service.PromotionRuleSnapshot;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 推广事实事件收件箱协调器。
 *
 * <p>协调器只负责幂等入箱、原子认领和失败调度；实际领域处理由独立事务处理器完成，
 * 避免同 Bean 自调用绕过事务和异常被吞后部分提交。</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PromotionEventInboxServiceImpl implements PromotionEventInboxService {
    private static final int BATCH_SIZE = 100;
    private static final long PROCESSING_TIMEOUT_MINUTES = 10;

    private final PromotionEventInboxDao inboxDao;
    private final PromotionRuleDomainService ruleService;
    private final PromotionEventProcessor eventProcessor;
    private final PromotionEventInboxFailureService failureService;
    private final PromotionCoinGrantService coinGrantService;
    private final PromotionRewardFailureService rewardFailureService;
    private final ObjectMapper objectMapper;

    @Override
    public PromotionEventInbox enqueueRegister(Long userId, List<String> traceNos) {
        String payload;
        try {
            payload = objectMapper.writeValueAsString(new PromotionRegisterPayload(
                    traceNos == null ? List.of() : traceNos));
        } catch (Exception ex) {
            throw new BusinessException("推广注册事件序列化失败");
        }
        return enqueue("register:" + userId,
                PromotionRewardEventEnum.REGISTER_REWARD.getCode(), userId, null, payload);
    }

    @Override
    public PromotionEventInbox enqueueBusinessEvent(String eventKey,
                                                    String eventType,
                                                    Long userId,
                                                    String bizNo) {
        if (!PromotionRewardEventEnum.supports(eventType)
                || PromotionRewardEventEnum.LADDER_BONUS.getCode().equals(eventType)) {
            throw new BusinessException("推广事实事件类型不支持");
        }
        return enqueue(eventKey, eventType, userId, bizNo, null);
    }

    @Override
    public void process(Long inboxId) {
        LocalDateTime now = LocalDateTime.now();
        if (inboxDao.claim(inboxId, now, now.minusMinutes(PROCESSING_TIMEOUT_MINUTES)) != 1) {
            return;
        }
        try {
            List<Long> rewardIds = eventProcessor.processClaimed(inboxId);
            for (Long rewardId : rewardIds) {
                try {
                    coinGrantService.grant(rewardId);
                } catch (Exception grantError) {
                    rewardFailureService.markFailed(
                            rewardId, grantError.getMessage(), LocalDateTime.now());
                }
            }
        } catch (Exception ex) {
            failureService.markFailed(inboxId, ex);
            log.warn("推广事件处理失败，inboxId={}", inboxId, ex);
        }
    }

    @Override
    public void processPendingBatch() {
        LocalDateTime now = LocalDateTime.now();
        Page<PromotionEventInbox> page = inboxDao.selectPage(
                new Page<>(1, BATCH_SIZE, false),
                new LambdaQueryWrapper<PromotionEventInbox>()
                        .and(wrapper -> wrapper.eq(PromotionEventInbox::getStatus, "pending")
                                .or(item -> item.eq(PromotionEventInbox::getStatus, "failed")
                                        .isNotNull(PromotionEventInbox::getNextRetryTime)
                                        .le(PromotionEventInbox::getNextRetryTime, now))
                                .or(item -> item.eq(PromotionEventInbox::getStatus, "processing")
                                        .le(PromotionEventInbox::getUpdateTime,
                                                now.minusMinutes(PROCESSING_TIMEOUT_MINUTES))))
                        .orderByAsc(PromotionEventInbox::getCreateTime));
        page.getRecords().forEach(item -> process(item.getId()));
    }

    private PromotionEventInbox enqueue(String eventKey,
                                        String eventType,
                                        Long userId,
                                        String bizNo,
                                        String payload) {
        PromotionEventInbox existing = inboxDao.selectByEventKey(eventKey);
        if (existing != null) {
            return existing;
        }
        PromotionRuleSnapshot normal = ruleService.current("normal_user");
        PromotionRuleSnapshot agent = ruleService.current("campus_agent");
        PromotionEventInbox inbox = new PromotionEventInbox();
        inbox.setEventKey(eventKey);
        inbox.setEventType(eventType);
        inbox.setUserId(userId);
        inbox.setBizNo(bizNo);
        inbox.setPayloadJson(payload);
        inbox.setNormalRuleId(normal == null ? null : normal.ruleId());
        inbox.setAgentRuleId(agent == null ? null : agent.ruleId());
        inbox.setStatus("pending");
        inbox.setRetryCount(0);
        try {
            inboxDao.insert(inbox);
            return inbox;
        } catch (DuplicateKeyException ex) {
            PromotionEventInbox winner = inboxDao.selectByEventKey(eventKey);
            if (winner != null) {
                return winner;
            }
            throw ex;
        }
    }
}

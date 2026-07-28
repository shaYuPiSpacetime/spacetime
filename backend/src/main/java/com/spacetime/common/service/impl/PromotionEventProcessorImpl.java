package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.PromotionEventInboxDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.entity.PromotionEventInbox;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.enums.PromotionRewardEventEnum;
import com.spacetime.common.model.promotion.PromotionRegisterPayload;
import com.spacetime.common.service.PromotionAgentBonusService;
import com.spacetime.common.service.PromotionAttributionService;
import com.spacetime.common.service.PromotionEventProcessor;
import com.spacetime.common.service.PromotionRewardDomainService;
import com.spacetime.common.service.PromotionRuleDomainService;
import com.spacetime.common.service.PromotionRuleSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

/**
 * 推广事件领域处理器。
 *
 * <p>关系、待发奖励和事件成功状态在同一个事务中提交；
 * 资产发放由协调器在提交后逐笔执行，技术异常在独立事务记录失败。</p>
 */
@Service
@RequiredArgsConstructor
public class PromotionEventProcessorImpl implements PromotionEventProcessor {
    private final PromotionEventInboxDao inboxDao;
    private final PromotionInviteRelationDao relationDao;
    private final PromotionAttributionService attributionService;
    private final PromotionRuleDomainService ruleService;
    private final PromotionRewardDomainService rewardService;
    private final PromotionAgentBonusService agentBonusService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public List<Long> processClaimed(Long inboxId) {
        PromotionEventInbox inbox = inboxDao.selectById(inboxId);
        if (inbox == null || !"processing".equals(inbox.getStatus())) {
            return List.of();
        }
        List<Long> rewardIds = new ArrayList<>();
        PromotionInviteRelation relation = resolveRelation(inbox);
        if (relation != null) {
            Long ruleId = "normal_user".equals(relation.getSourceType())
                    ? inbox.getNormalRuleId() : inbox.getAgentRuleId();
            if (ruleId != null) {
                PromotionRuleSnapshot rule = ruleService.byId(ruleId);
                if ("normal_user".equals(relation.getSourceType())) {
                    List<PromotionRewardLog> rewards = rewardService.createForEvent(
                            relation, inbox.getEventType(), rule, inbox.getCreateTime());
                    rewards.stream().map(PromotionRewardLog::getId)
                            .filter(java.util.Objects::nonNull)
                            .forEach(rewardIds::add);
                } else {
                    agentBonusService.createForEvent(
                            relation, inbox.getEventType(), rule, inbox.getCreateTime());
                }
            }
        }
        inbox.setStatus("success");
        inbox.setProcessedAt(LocalDateTime.now());
        inbox.setLastError(null);
        inbox.setNextRetryTime(null);
        inboxDao.updateById(inbox);
        return rewardIds;
    }

    private PromotionInviteRelation resolveRelation(PromotionEventInbox inbox) {
        if (PromotionRewardEventEnum.REGISTER_REWARD.getCode().equals(inbox.getEventType())) {
            PromotionRegisterPayload payload;
            try {
                payload = objectMapper.readValue(inbox.getPayloadJson(), PromotionRegisterPayload.class);
            } catch (Exception ex) {
                throw new IllegalStateException("推广注册事件载荷无法解析", ex);
            }
            if (payload.traceNos() == null || payload.traceNos().isEmpty()) {
                return null;
            }
            return attributionService.bindNewUser(
                    inbox.getUserId(), inbox.getCreateTime(), payload.traceNos(), true);
        }
        return relationDao.selectByInviteeId(inbox.getUserId());
    }
}

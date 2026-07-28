package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionAgentBonusLog;
import com.spacetime.common.entity.PromotionInviteRelation;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 校园推广员奖金生成服务。
 */
public interface PromotionAgentBonusService {
    List<PromotionAgentBonusLog> createForEvent(PromotionInviteRelation relation,
                                                String eventType,
                                                PromotionRuleSnapshot rule,
                                                LocalDateTime occurredAt);
}

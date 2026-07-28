package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 普通邀请奖励生成领域服务。
 */
public interface PromotionRewardDomainService {
    List<PromotionRewardLog> createForEvent(PromotionInviteRelation relation,
                                            String eventType,
                                            PromotionRuleSnapshot rule,
                                            LocalDateTime occurredAt);
}

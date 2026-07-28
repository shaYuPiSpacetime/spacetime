package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 推广来源记录与注册归因服务。
 */
public interface PromotionAttributionService {
    PromotionSourceTrace createNormalTrace(Long inviterId);
    PromotionSourceTrace createAnonymousTrace(String sourceType, String sourceToken, String visitorKey);
    PromotionInviteRelation bindNewUser(Long inviteeId,
                                        LocalDateTime registeredAt,
                                        List<String> traceNos,
                                        boolean newlyRegistered);
}

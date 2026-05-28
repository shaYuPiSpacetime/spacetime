package com.spacetime.miniapp.service;

import com.spacetime.common.entity.PromotionInviteRelation;

/**
 * 邀请业务事件统一入口。
 */
public interface PromotionInviteEventService {
    PromotionInviteRelation handleInviteEvent(Long inviteeId, String eventType);
}

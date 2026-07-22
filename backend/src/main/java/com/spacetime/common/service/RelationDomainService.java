package com.spacetime.common.service;

import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.enums.RelationInvalidReasonEnum;

import java.time.LocalDateTime;

/** 喜欢、访客、匹配来源和匹配弹窗的公共关系领域服务。 */
public interface RelationDomainService {
    /** 创建一次喜欢生命周期；双向喜欢时追加匹配来源。 */
    AppRelationLike createLike(String requestId, Long fromUserId, Long toUserId,
                               String sourceScene, LocalDateTime likedTime);

    /** 取消当前有效喜欢；仅撤销由该双向喜欢形成的匹配来源。 */
    void cancelLike(Long fromUserId, Long toUserId, LocalDateTime cancelledTime);

    /** 记录一次真实主页访问并按滚动 30 分钟归并展示记录。 */
    AppRelationVisit recordVisit(String eventNo, Long visitorUserId, Long targetUserId,
                                 String sourceScene, LocalDateTime visitTime);

    /** 为无序用户对幂等追加匹配来源，必要时创建新匹配生命周期。 */
    AppRelationMatch addMatchSource(Long userA, Long userB, String sourceType,
                                    String sourceEventNo, LocalDateTime effectiveTime);

    /** 撤销匹配来源；最后一个有效来源撤销时使匹配生命周期失效。 */
    void revokeMatchSource(String sourceType, String sourceEventNo,
                           RelationInvalidReasonEnum reason, LocalDateTime revokedTime);

    /** 记录匹配弹窗已下发但不改变待回执状态。 */
    void markPopupDelivered(String matchNo, Long userId, LocalDateTime deliveredTime);

    /** 记录用户主动动作并将匹配弹窗标记为已读。 */
    void markPopupRead(String matchNo, Long userId, String action, LocalDateTime readTime);
}

package com.spacetime.common.service;

import com.spacetime.common.enums.RelationInvalidReasonEnum;

import java.time.LocalDateTime;

/** 账号、拉黑、风控和认证事件触发的关系批量失效服务。 */
public interface RelationLifecycleService {
    /** 失效指定用户参与的全部有效关系。 */
    void invalidateByUser(Long userId, RelationInvalidReasonEnum reason, LocalDateTime invalidTime);
    /** 失效指定无序用户对两个方向的全部有效关系。 */
    void invalidateByPair(Long userA, Long userB, RelationInvalidReasonEnum reason, LocalDateTime invalidTime);
}

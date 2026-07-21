package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.enums.RelationSourceSceneEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 用户喜欢关系生命周期事实。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_like")
public class AppRelationLike extends BaseEntity {
    /** 喜欢业务编号，前缀 LIK-。 */
    private String likeNo;
    /** 客户端发起喜欢幂等键。 */
    private String requestId;
    /** 发起喜欢的用户 ID。 */
    private Long fromUserId;
    /** 接收喜欢的用户 ID。 */
    private Long toUserId;
    /** 喜欢来源。 @see RelationSourceSceneEnum */
    private String sourceScene;
    /** 喜欢状态。 @see RelationLikeStatusEnum */
    private String likeStatus;
    /** 有效唯一标记：有效时为 1，结束后为空。 */
    private Integer activeMarker;
    /** 喜欢生效时间。 */
    private LocalDateTime likedTime;
    /** 取消喜欢时间。 */
    private LocalDateTime cancelledTime;
    /** 失效原因。 @see RelationInvalidReasonEnum */
    private String invalidReason;
    /** 取消或失效的业务事件时间。 */
    private LocalDateTime invalidTime;
}

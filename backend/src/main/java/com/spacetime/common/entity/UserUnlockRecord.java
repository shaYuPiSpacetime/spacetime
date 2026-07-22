package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 用户解锁记录
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_unlock_record")
public class UserUnlockRecord extends BaseEntity {
    /** 解锁业务编号，前缀 ULK-。 */
    private String unlockNo;
    /** 客户端请求幂等键 */
    private String requestId;
    /** 用户ID（发起解锁者） */
    private Long userId;
    /** 被解锁目标用户ID */
    private Long targetUserId;
    /** 目标业务类型：like-喜欢记录，visit-访客记录。 */
    private String targetBizType;
    /** 具体关系业务编号，前缀 LIK- 或 VIS-。 */
    private String targetBizNo;
    /** 特批退款业务编号。 */
    private String refundNo;
    /** 有效唯一标记：有效时为 1，过期或退款后为空。 */
    private Integer activeMarker;
    /** 解锁场景 */
    private String unlockScene;
    /** 解锁方式 */
    private String unlockMethod;
    /** 消耗成家币数量 */
    private Integer coinCost;
    /** 生效时间 */
    private LocalDateTime effectiveTime;
    /** 过期时间 */
    private LocalDateTime expireTime;
    /** 解锁状态。 @see com.spacetime.common.enums.UnlockRecordStatusEnum */
    private String status;
}

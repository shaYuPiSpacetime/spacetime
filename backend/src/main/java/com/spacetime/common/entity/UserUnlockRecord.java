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
    /** 用户ID（发起解锁者） */
    private Long userId;
    /** 被解锁目标用户ID */
    private Long targetUserId;
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
    /** 状态: active/expired */
    private String status;
}

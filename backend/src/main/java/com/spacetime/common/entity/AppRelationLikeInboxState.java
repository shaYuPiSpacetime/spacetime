package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 用户“喜欢我的”收件箱读取位置。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_like_inbox_state")
public class AppRelationLikeInboxState extends BaseEntity {
    /** 接收喜欢的用户 ID，每个用户唯一一条。 */
    private Long userId;
    /** 已确认查看到的喜欢生效时间。 */
    private LocalDateTime lastReadLikedTime;
    /** 已确认查看到的喜欢记录主键 ID，与时间组成稳定游标。 */
    private Long lastReadLikeId;
    /** 最近一次成功推进读取位置的时间。 */
    private LocalDateTime readAt;
}

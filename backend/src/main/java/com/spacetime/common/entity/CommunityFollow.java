package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 社区关注关系
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_follow")
public class CommunityFollow extends BaseEntity {
    /** 关注者ID */
    private Long followerId;
    /** 被关注用户ID */
    private Long targetUserId;
    /** 关注状态 @see CommunityFollowStatusEnum */
    private String status;
}

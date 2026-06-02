package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 社区点赞关系
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_like")
public class CommunityLike extends BaseEntity {
    /** 动态ID */
    private Long postId;
    /** 点赞用户ID */
    private Long userId;
    /** 状态(ENABLED/DISABLED) */
    private String status;
}

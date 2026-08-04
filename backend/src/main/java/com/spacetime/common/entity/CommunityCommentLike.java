package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 评论点赞关系。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_comment_like")
public class CommunityCommentLike extends BaseEntity {
    private Long commentId;
    private Long userId;
    private String status;
    private Integer activeMarker;
}

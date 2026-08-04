package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 本人社区浏览历史。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_view_history")
public class CommunityViewHistory extends BaseEntity {
    private Long userId;
    private Long postId;
    private LocalDateTime viewedAt;
}

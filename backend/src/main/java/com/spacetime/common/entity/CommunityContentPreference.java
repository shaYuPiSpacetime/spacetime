package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 作者级内容偏好。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_content_preference")
public class CommunityContentPreference extends BaseEntity {
    private Long userId;
    private Long targetUserId;
    private String actionType;
    private String status;
}

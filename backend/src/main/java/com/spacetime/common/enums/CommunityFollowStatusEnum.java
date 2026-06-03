package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 关注关系状态
 */
@Getter
public enum CommunityFollowStatusEnum {
    FOLLOW("FOLLOW", "已关注"),
    UNFOLLOW("UNFOLLOW", "已取消关注");

    /** 枚举编码 */
    private final String code;
    /** 枚举描述 */
    private final String desc;

    CommunityFollowStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

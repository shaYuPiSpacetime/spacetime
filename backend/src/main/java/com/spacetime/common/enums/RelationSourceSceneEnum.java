package com.spacetime.common.enums;

import lombok.Getter;

/** 喜欢与访客事件来源场景。 */
@Getter
public enum RelationSourceSceneEnum {
    /** 觅缘推荐。 */
    FATE("fate", "觅缘"),
    /** 精选推荐。 */
    FEATURED("featured", "精选"),
    /** 理想型推荐。 */
    IDEAL("ideal", "理想型"),
    /** 婚恋用户主页。 */
    PROFILE("profile", "婚恋主页"),
    /** 喜欢我的列表。 */
    LIKES_ME("likes_me", "喜欢我的"),
    /** 最近访客列表。 */
    RECENT_VIEWERS("recent_viewers", "最近访客");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationSourceSceneEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

package com.spacetime.common.enums;

import lombok.Getter;

/** 匹配成立来源类型。 */
@Getter
public enum RelationMatchSourceTypeEnum {
    /** 双方互送爱心。 */
    DOUBLE_LIKE("double_like", "双方互送爱心"),
    /** 精选心动后回爱心。 */
    FEATURED_HEART_RETURN_LIKE("featured_heart_return_like", "精选心动后回爱心"),
    /** 悄悄话收到回复。 */
    WHISPER_REPLY("whisper_reply", "悄悄话回复");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationMatchSourceTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

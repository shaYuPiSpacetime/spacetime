package com.spacetime.common.enums;

import lombok.Getter;

/** 消息规则和模板版本状态及中文含义。 */
@Getter
public enum MessageVersionStatusEnum {
    DRAFT("draft", "草稿"),
    PUBLISHED("published", "已发布"),
    RETIRED("retired", "已退役");

    private final String code;
    private final String desc;

    MessageVersionStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

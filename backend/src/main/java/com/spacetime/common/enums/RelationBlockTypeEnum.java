package com.spacetime.common.enums;

import lombok.Getter;

@Getter
public enum RelationBlockTypeEnum {
    BLACKLIST("BLACKLIST", "黑名单"),
    HIDDEN_DYNAMIC("HIDDEN_DYNAMIC", "不看TA动态");

    private final String code;
    private final String desc;

    RelationBlockTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static RelationBlockTypeEnum getByCode(String code) {
        for (RelationBlockTypeEnum e : values()) {
            if (e.code.equals(code)) {
                return e;
            }
        }
        return null;
    }
}

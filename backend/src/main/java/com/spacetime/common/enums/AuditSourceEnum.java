package com.spacetime.common.enums;

import lombok.Getter;

@Getter
public enum AuditSourceEnum {
    MACHINE("MACHINE", "机审"),
    MANUAL("MANUAL", "人工审核");

    private final String code;
    private final String desc;

    AuditSourceEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

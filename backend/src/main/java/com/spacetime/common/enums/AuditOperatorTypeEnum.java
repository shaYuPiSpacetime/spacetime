package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 审核历史操作主体。
 */
@Getter
public enum AuditOperatorTypeEnum {
    USER("USER", "用户"),
    ADMIN("ADMIN", "管理员"),
    SYSTEM("SYSTEM", "系统"),
    PROVIDER("PROVIDER", "第三方 Provider");

    private final String code;
    private final String desc;

    AuditOperatorTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

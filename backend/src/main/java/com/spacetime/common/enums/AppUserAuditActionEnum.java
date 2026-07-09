package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 审核历史动作枚举。
 */
@Getter
public enum AppUserAuditActionEnum {
    SUBMIT("SUBMIT", "提交"),
    MACHINE_START("MACHINE_START", "机审开始"),
    MACHINE_PASS("MACHINE_PASS", "机审通过"),
    MACHINE_REJECT("MACHINE_REJECT", "机审驳回"),
    MANUAL_APPROVE("MANUAL_APPROVE", "人工通过"),
    MANUAL_REJECT("MANUAL_REJECT", "人工驳回"),
    MANUAL_EXPIRE("MANUAL_EXPIRE", "人工失效"),
    SYSTEM_EXPIRE("SYSTEM_EXPIRE", "系统失效");

    private final String code;
    private final String desc;

    AppUserAuditActionEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

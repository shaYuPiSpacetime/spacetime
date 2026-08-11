package com.spacetime.common.enums;

import lombok.Getter;

/** 敏感正文访问审计结果及中文含义。 */
@Getter
public enum MessageSensitiveAccessResultEnum {
    PENDING("pending", "校验中"),
    ALLOWED("allowed", "允许查看"),
    DENIED("denied", "拒绝查看"),
    ERROR("error", "处理异常");

    private final String code;
    private final String desc;

    MessageSensitiveAccessResultEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

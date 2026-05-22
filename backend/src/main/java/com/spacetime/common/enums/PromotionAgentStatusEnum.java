package com.spacetime.common.enums;

/**
 * 代理合作状态
 */
public enum PromotionAgentStatusEnum {
    NORMAL("normal"),
    PAUSED("paused"),
    TERMINATED("terminated");

    private final String code;

    PromotionAgentStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

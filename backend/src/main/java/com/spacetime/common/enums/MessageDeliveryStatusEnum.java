package com.spacetime.common.enums;

import lombok.Getter;

/** 悄悄话投递状态。 */
@Getter
public enum MessageDeliveryStatusEnum {
    QUEUED("queued", "待投递"),
    SENT("sent", "已送达"),
    FAILED("failed", "投递失败");

    private final String code;
    private final String desc;

    MessageDeliveryStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

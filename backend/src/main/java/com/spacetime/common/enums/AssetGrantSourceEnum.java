package com.spacetime.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 资产赠送来源。 */
@Getter
@RequiredArgsConstructor
public enum AssetGrantSourceEnum {
    ADMIN("admin_grant"),
    CERTIFICATION("certification_reward");
    /** 持久化编码 */
    private final String code;
}

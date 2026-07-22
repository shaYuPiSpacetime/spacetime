package com.spacetime.common.enums;

import lombok.Getter;

/** 关系生命周期失效原因。 */
@Getter
public enum RelationInvalidReasonEnum {
    /** 取消喜欢或最后一个爱心来源撤销。 */
    LIKE_CANCELLED("like_cancelled", "取消喜欢"),
    /** 任一方拉黑。 */
    BLOCKED("blocked", "任一方拉黑"),
    /** 任一方账号被冻结。 */
    ACCOUNT_FROZEN("account_frozen", "账号冻结"),
    /** 任一方账号进入注销中或已注销。 */
    ACCOUNT_DELETED("account_deleted", "账号注销"),
    /** 任一方被风控封禁。 */
    RISK_BANNED("risk_banned", "风控封禁"),
    /** 任一方核心认证失效。 */
    CERTIFICATION_REVOKED("certification_revoked", "认证失效");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationInvalidReasonEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

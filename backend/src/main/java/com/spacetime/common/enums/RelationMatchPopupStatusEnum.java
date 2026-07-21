package com.spacetime.common.enums;

import lombok.Getter;

/** 匹配成功弹窗状态。 */
@Getter
public enum RelationMatchPopupStatusEnum {
    /** 待展示或待主动动作回执。 */
    PENDING("pending", "待展示或待回执"),
    /** 用户已通过主动动作确认。 */
    READ("read", "已读"),
    /** 匹配在展示前已经失效。 */
    CANCELLED("cancelled", "展示前已取消");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationMatchPopupStatusEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

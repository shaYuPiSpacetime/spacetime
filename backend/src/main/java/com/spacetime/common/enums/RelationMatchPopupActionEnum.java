package com.spacetime.common.enums;

import lombok.Getter;

/** 匹配弹窗已读动作。 */
@Getter
public enum RelationMatchPopupActionEnum {
    /** 稍后处理。 */
    LATER("later", "稍后"),
    /** 主动关闭。 */
    CLOSE("close", "关闭"),
    /** 查看对方主页。 */
    PROFILE("profile", "查看主页"),
    /** 进入聊天。 */
    CHAT("chat", "去聊天"),
    /** 使用系统返回。 */
    SYSTEM_BACK("system_back", "系统返回");

    /** 数据库存储编码。 */
    private final String code;
    /** 中文说明。 */
    private final String desc;

    RelationMatchPopupActionEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}

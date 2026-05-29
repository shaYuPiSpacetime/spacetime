package com.spacetime.common.enums;

import lombok.Getter;

/**
 * 文章类型枚举
 */
@Getter
public enum ArticleTypeEnum {
    /** 公告 */
    ANNOUNCEMENT("ANNOUNCEMENT", "公告"),
    /** 帮助文档 */
    HELP_DOC("HELP_DOC", "帮助文档"),
    /** 规则/协议说明 */
    RULE("RULE", "规则/协议说明"),
    /** 交友指南 */
    SAFETY_GUIDE("SAFETY_GUIDE", "交友指南"),
    /** 反诈指南 */
    FRAUD_GUIDE("FRAUD_GUIDE", "反诈指南"),
    /** 安全中心内容 */
    SECURITY_CONTENT("SECURITY_CONTENT", "安全中心内容"),
    /** 关于我们 */
    ABOUT_US("ABOUT_US", "关于我们");

    /** 类型编码（存入数据库） */
    private final String code;
    /** 中文描述 */
    private final String desc;

    ArticleTypeEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    /**
     * 根据 code 获取枚举实例
     */
    public static ArticleTypeEnum getByCode(String code) {
        for (ArticleTypeEnum e : values()) {
            if (e.getCode().equals(code)) {
                return e;
            }
        }
        return null;
    }
}

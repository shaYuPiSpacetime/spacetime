package com.spacetime.common.util;

import cn.hutool.core.util.StrUtil;

/**
 * 脱敏工具
 */
public final class DesensitizeUtil {
    private DesensitizeUtil() {
    }

    /** 手机号脱敏 */
    public static String maskPhone(String phone) {
        if (StrUtil.isBlank(phone) || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /** 通用名称脱敏 */
    public static String maskName(String name) {
        if (StrUtil.isBlank(name) || name.length() <= 1) {
            return name;
        }
        return name.charAt(0) + "**";
    }
}

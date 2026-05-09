package com.spacetime.common.constant;

/**
 * 认证相关常量
 */
public class AuthConstant {
    /** 请求头中的 token 字段名 */
    public static final String TOKEN_HEADER = "X-Auth-Token";
    /** 管理后台 Redis token key 前缀 */
    public static final String ADMIN_TOKEN_PREFIX = "admin:token:";
    /** 小程序 Redis token key 前缀 */
    public static final String MINIAPP_TOKEN_PREFIX = "miniapp:token:";

    private AuthConstant() {}
}

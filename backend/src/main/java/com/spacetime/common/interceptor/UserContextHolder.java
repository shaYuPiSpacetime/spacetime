package com.spacetime.common.interceptor;

/**
 * ThreadLocal 持有当前请求的用户上下文
 * 请求进入时由 TokenInterceptor 写入，结束后在 afterCompletion 中清除，防止内存泄漏
 */
public class UserContextHolder {
    private static final ThreadLocal<UserContext> CONTEXT = new ThreadLocal<>();

    public static void set(UserContext context) {
        CONTEXT.set(context);
    }

    public static UserContext get() {
        return CONTEXT.get();
    }

    /** 必须在请求结束时调用，防止内存泄漏 */
    public static void clear() {
        CONTEXT.remove();
    }
}

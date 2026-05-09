package com.spacetime.common.interceptor;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * 当前登录用户上下文，由 TokenInterceptor 从 Redis 中反序列化后写入 ThreadLocal
 */
@Data
@AllArgsConstructor
public class UserContext {
    /** 用户 ID */
    private Long id;
    /** 用户昵称 */
    private String nickname;
    /** 角色列表（admin / user 等） */
    private List<String> roles;
}

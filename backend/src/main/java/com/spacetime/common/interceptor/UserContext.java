package com.spacetime.common.interceptor;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 当前登录用户上下文，由 TokenInterceptor 从 Redis 中反序列化后写入 ThreadLocal
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserContext {
    /** 用户 ID */
    private Long id;
    /** 用户昵称 */
    private String nickname;
    /** 角色编码列表 */
    private List<String> roles;
    /** 权限标识列表，如 system:user:list */
    private List<String> permissions;
}

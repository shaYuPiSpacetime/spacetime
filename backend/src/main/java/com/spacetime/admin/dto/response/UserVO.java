package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户列表响应体
 */
@Data
public class UserVO {
    /** 用户 ID */
    private Long id;
    /** 用户名 */
    private String username;
    /** 昵称 */
    private String nickname;
    /** 邮箱 */
    private String email;
    /** 手机号 */
    private String phone;
    /** 头像 URL */
    private String avatar;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    private String status;
    /** 角色名称列表 */
    private List<String> roleNames;
    /** 最后登录时间 */
    private LocalDateTime lastLoginTime;
    /** 创建时间 */
    private LocalDateTime createTime;
}

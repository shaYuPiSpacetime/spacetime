package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 登录返回
 */
@Data
public class LoginVO {
    /** 登录 token */
    private String token;
    /** 用户昵称 */
    private String nickname;
    /** 头像 URL */
    private String avatar;
    /** 权限列表 */
    private List<String> permissions;
}

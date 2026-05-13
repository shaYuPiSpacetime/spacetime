package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 用户创建请求体
 */
@Data
public class UserCreateReq {
    /** 用户名 */
    @NotBlank(message = "用户名不能为空")
    private String username;
    /** 密码 */
    @NotBlank(message = "密码不能为空")
    private String password;
    /** 昵称 */
    @NotBlank(message = "昵称不能为空")
    private String nickname;
    /** 邮箱 */
    private String email;
    /** 手机号 */
    private String phone;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    private String status;
}

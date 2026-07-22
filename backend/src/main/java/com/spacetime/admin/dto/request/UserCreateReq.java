package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
    @Size(min = 6, max = 72, message = "密码长度必须在6到72个字符之间")
    private String password;
    /** 昵称 */
    @NotBlank(message = "昵称不能为空")
    private String nickname;
    /** 邮箱 */
    @Email(message = "邮箱格式不正确")
    private String email;
    /** 手机号 */
    private String phone;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    @Pattern(regexp = "ENABLED|DISABLED", message = "状态只能是ENABLED或DISABLED")
    private String status;
}

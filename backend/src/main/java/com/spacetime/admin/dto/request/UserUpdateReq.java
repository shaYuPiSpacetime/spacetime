package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 用户更新请求体
 */
@Data
public class UserUpdateReq {
    /** 用户 ID（由 Controller 从 @PathVariable 注入） */
    private Long id;
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

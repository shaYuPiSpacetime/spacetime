package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 重置密码请求体
 */
@Data
public class ResetPwdReq {
    /** 用户 ID（由 Controller 从 @PathVariable 注入） */
    private Long userId;
    /** 新密码 */
    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 72, message = "新密码长度必须在6到72个字符之间")
    private String newPassword;
}

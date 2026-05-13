package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
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
    private String newPassword;
}

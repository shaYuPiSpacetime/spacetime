package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 管理后台彻底删除 App 用户请求。 */
@Data
public class DeleteAppUserReq {

    /** 删除原因，写入最小化审计日志。 */
    @NotBlank(message = "删除原因不能为空")
    @Size(min = 2, max = 200, message = "删除原因长度应为2到200个字符")
    private String reason;
}

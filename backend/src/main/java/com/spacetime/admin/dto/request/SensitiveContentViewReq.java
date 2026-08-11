package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 高敏正文查看请求；前端二次确认后提交原因和一次性请求编号。 */
@Data
public class SensitiveContentViewReq {
    @NotBlank(message = "查看原因不能为空")
    @Size(min = 5, max = 100, message = "查看原因长度必须为5-100个字符")
    private String viewReason;

    @NotBlank(message = "请求编号不能为空")
    @Size(min = 8, max = 64, message = "请求编号长度必须为8-64个字符")
    private String requestId;
}

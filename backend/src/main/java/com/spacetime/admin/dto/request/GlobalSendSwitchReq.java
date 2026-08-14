package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 高风险全局消息发送开关请求。 */
@Data
public class GlobalSendSwitchReq {
    @NotNull private Boolean enabled;
    @NotNull @Min(0) private Integer expectedVersion;
    @NotBlank(message = "变更原因不能为空")
    @Size(min = 5, max = 100, message = "变更原因长度必须为5-100个字符")
    private String reason;
}

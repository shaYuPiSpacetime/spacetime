package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/** 悄悄话发送预检查请求。 */
@Data
public class WhisperPrecheckReq {
    /** 接收方稳定编号，格式为 USR- 加 12 位数字。 */
    @NotBlank(message = "目标用户编号不能为空")
    @Pattern(regexp = "^USR-\\d{12}$", message = "目标用户编号格式不正确")
    private String targetUserNo;

    /** 兼容旧客户端的来源业务编号；不参与发送资格判断。 */
    private String sourcePostNo;

    /** 兼容旧客户端的入口场景；推荐、主页和社区均可发起。 */
    private String scene;
}

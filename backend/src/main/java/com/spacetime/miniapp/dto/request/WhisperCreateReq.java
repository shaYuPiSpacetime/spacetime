package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 创建悄悄话请求。 */
@Data
public class WhisperCreateReq {
    /** 接收方稳定编号，格式为 USR- 加 12 位数字。 */
    @NotBlank(message = "目标用户编号不能为空")
    @Pattern(regexp = "^USR-\\d{12}$", message = "目标用户编号格式不正确")
    private String targetUserNo;

    /** 预检返回的短期可信报价令牌。 */
    @NotBlank(message = "报价令牌不能为空")
    @Size(max = 128, message = "报价令牌不能超过128个字符")
    private String quoteToken;

    /** 兼容旧客户端的来源业务编号；不参与支付报价。 */
    private String sourcePostNo;

    /** 兼容旧客户端的入口场景。 */
    private String scene;

    /** 悄悄话正文，长度为 1 至 60 字。 */
    @NotBlank(message = "悄悄话内容不能为空")
    @Size(max = 60, message = "悄悄话内容不能超过60字")
    private String content;
}

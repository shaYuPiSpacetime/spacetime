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

    /** 来源动态业务编号。 */
    @NotBlank(message = "来源动态编号不能为空")
    @Size(max = 64, message = "来源动态编号不能超过64个字符")
    private String sourcePostNo;

    /** 当前仅支持动态详情入口。 */
    @NotBlank(message = "悄悄话场景不能为空")
    @Pattern(regexp = "^community_post$", message = "悄悄话场景不支持")
    private String scene;

    /** 悄悄话正文，长度为 1 至 60 字。 */
    @NotBlank(message = "悄悄话内容不能为空")
    @Size(max = 60, message = "悄悄话内容不能超过60字")
    private String content;
}

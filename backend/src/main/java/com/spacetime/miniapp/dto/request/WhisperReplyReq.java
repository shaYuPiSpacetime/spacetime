package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 回复悄悄话并完成匹配请求。 */
@Data
public class WhisperReplyReq {
    @NotBlank(message = "回复幂等请求编号不能为空")
    @Size(min = 8, max = 64, message = "回复幂等请求编号长度应为8到64个字符")
    private String requestId;

    @NotBlank(message = "回复内容不能为空")
    @Size(max = 500, message = "回复内容不能超过500个字符")
    private String content;
}

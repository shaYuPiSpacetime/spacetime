package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 普通私信发送请求。 */
@Data
public class MessageSendReq {
    @NotBlank(message = "消息幂等编号不能为空")
    @Size(min = 8, max = 64, message = "消息幂等编号长度应为8到64个字符")
    private String clientMsgId;

    @NotBlank(message = "消息正文不能为空")
    @Size(max = 1000, message = "消息正文不能超过1000个字符")
    private String content;
}

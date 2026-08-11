package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 私信会话已读游标确认请求。 */
@Data
public class MessageReadReq {
    @NotBlank(message = "最后已读消息编号不能为空")
    @Size(max = 64, message = "最后已读消息编号不能超过64个字符")
    private String lastMessageNo;
}

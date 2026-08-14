package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

/** 私信会话已读游标确认请求。 */
@Data
public class MessageReadReq {
    @Size(max = 64, message = "最后已读消息编号不能超过64个字符")
    private String lastMessageNo;

    /** TIM SDK 返回的消息编号；不知道平台消息编号时可用。 */
    @Size(max = 128, message = "TIM消息编号不能超过128个字符")
    private String timMessageId;

    /** TIM 服务端消息唯一键；可与 timMessageId 一起提交以增强定位。 */
    @Size(max = 128, message = "TIM消息唯一键不能超过128个字符")
    private String timMsgKey;
}

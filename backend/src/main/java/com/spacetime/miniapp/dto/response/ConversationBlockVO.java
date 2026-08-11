package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 从会话内拉黑对方后的业务结果。 */
@Data
public class ConversationBlockVO {
    private String conversationNo;
    private String conversationStatus;
    private String blockNo;
    private Boolean canSend;
}

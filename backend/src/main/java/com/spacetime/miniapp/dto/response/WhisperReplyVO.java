package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 回复并匹配成功结果。 */
@Data
public class WhisperReplyVO {
    private String whisperNo;
    private String status;
    private String matchNo;
    private String conversationNo;
    private String replyMessageNo;
    private String replyTimMessageId;
    private String replyTimMsgKey;
    private LocalDateTime repliedTime;
}

package com.spacetime.common.model.message;

import java.time.LocalDateTime;

/** 回复悄悄话后生成的匹配与私信会话结果。 */
public record WhisperReplyResult(
        String whisperNo,
        String status,
        String matchNo,
        String conversationNo,
        String replyMessageNo,
        String replyTimMessageId,
        String replyTimMsgKey,
        LocalDateTime repliedAt) {
}

package com.spacetime.common.community;

/**
 * 客户端可提交的聊天举报最小定位字段。正文和被举报人均不在此对象中。
 */
public record ChatReportLookup(
        String sourceType,
        String conversationNo,
        String whisperNo,
        String messageNo,
        String targetBizNo,
        String timConversationId,
        String timMessageId,
        String timMsgKey
) {
    public ChatReportLookup(String sourceType, String conversationNo, String whisperNo,
                            String messageNo) {
        this(sourceType, conversationNo, whisperNo, messageNo, null, null, null, null);
    }
}

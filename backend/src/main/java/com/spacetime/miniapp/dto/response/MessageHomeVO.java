package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 消息首页聚合结果。 */
@Data
public class MessageHomeVO {
    private String accessMode;
    private String restrictionPrompt;
    private MessageUnreadSummaryVO unreadSummary;
    private MessageWhisperSummaryVO whisperSummary;
    private LikesMeSummaryVO likesMeSummary;
    private MessageChannelSummaryVO assistantSummary;
    private MessageChannelSummaryVO systemSummary;
    private MessageConversationPageVO conversationPage;
}

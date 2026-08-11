package com.spacetime.admin.dto.response;

import lombok.Data;

/** App 用户消息互动摘要，仅统计业务元数据。 */
@Data
public class UserMessageSummaryVO {
    private Long conversationCount;
    private Long activeConversationCount;
    private Long privateMessageCount;
    private Long privateUnreadCount;
    private Long whisperCount;
    private Long pendingWhisperCount;
    private Long whisperUnreadCount;
    private Long systemMessageCount;
    private Long unreadSystemMessageCount;
    private Long assistantUnreadCount;
    private Long platformMessageCount;
    private Long platformUnreadCount;
    private Long messageUnreadCount;
    private Long reportCount;
}

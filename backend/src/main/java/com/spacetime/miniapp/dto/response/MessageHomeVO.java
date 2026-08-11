package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 消息首页平台投影。 */
@Data
public class MessageHomeVO {
    private String accessMode;
    private String restrictionPrompt;
    private MessageUnreadSummaryVO platformUnreadSummary;
    private List<MessageFixedEntryVO> fixedEntries;
    private List<MessageConversationItemVO> recentConversationBindings;
    private Integer recentConversationLimit;
    private Boolean hasMoreConversations;
}

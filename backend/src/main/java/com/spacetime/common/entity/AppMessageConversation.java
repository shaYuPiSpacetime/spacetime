package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.MessageConversationStatusEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 两名用户在一个匹配生命周期中的私信会话。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_conversation")
public class AppMessageConversation extends BaseEntity {
    private String conversationNo;
    private String timConversationId;
    private Long matchId;
    private String matchNo;
    private Long userLowId;
    private Long userHighId;
    /** @see MessageConversationStatusEnum */
    private String status;
    private Integer activeMarker;
    private String configVersion;
    private Integer protectionEnabled;
    private Long femaleUserId;
    private Long maleUserId;
    private LocalDateTime protectionUntil;
    private LocalDateTime femaleFirstMessageAt;
    private Long lastMessageId;
    private LocalDateTime lastMessageTime;
    private Long blockedByUserId;
    private String invalidReason;
    private LocalDateTime invalidTime;
    private LocalDateTime isolatedAt;
    private LocalDateTime purgeAfter;
    private Integer version;
}

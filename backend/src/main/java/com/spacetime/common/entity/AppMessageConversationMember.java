package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 私信会话参与者、对方映射及平台未读投影水位。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_conversation_member")
public class AppMessageConversationMember extends BaseEntity {
    private Long conversationId;
    private String conversationNo;
    private Long userId;
    private Long peerUserId;
    /** TIM 或 HTTP 已读确认覆盖的最近消息发送时间，只允许单调递增。 */
    private LocalDateTime lastReadMessageTime;
    /** 最近一次推进已读水位的业务时间，只允许单调递增。 */
    private LocalDateTime lastReadAt;
    private Integer version;
}

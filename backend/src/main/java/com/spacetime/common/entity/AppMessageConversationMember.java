package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 私信会话参与者与对方映射，普通私信未读由腾讯云 TIM 维护。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_conversation_member")
public class AppMessageConversationMember extends BaseEntity {
    private Long conversationId;
    private String conversationNo;
    private Long userId;
    private Long peerUserId;
    private Integer version;
}

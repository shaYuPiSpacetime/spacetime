package com.spacetime.common.service;

import com.spacetime.common.model.message.PrivateMessageSendResult;
import com.spacetime.common.model.message.WhisperReplyResult;

import java.time.LocalDateTime;

/** 悄悄话与私信会话的公共事务状态机。 */
public interface MessageDomainService {
    /** 普通私信先落消息事实与Outbox，再可靠投递到TIM。 */
    PrivateMessageSendResult sendPrivateMessage(Long senderUserId, String conversationNo,
                                                String clientMsgId, String content,
                                                LocalDateTime sentAt);

    /** 预占回复、经 TIM 可靠投递，并在投递成功后创建匹配与会话。 */
    WhisperReplyResult replyWhisper(Long receiverUserId, String whisperNo, String requestId,
                                    String replyContent, LocalDateTime repliedAt);
}

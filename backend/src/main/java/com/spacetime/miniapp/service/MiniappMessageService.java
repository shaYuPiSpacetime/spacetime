package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.AssistantMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.ConversationBlockReq;
import com.spacetime.miniapp.dto.request.MessageReadReq;
import com.spacetime.miniapp.dto.request.SystemMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReplyReq;
import com.spacetime.miniapp.dto.response.AssistantMessagePageVO;
import com.spacetime.miniapp.dto.response.ConversationBlockVO;
import com.spacetime.miniapp.dto.response.MessageConversationDetailVO;
import com.spacetime.miniapp.dto.response.MessageConversationPageVO;
import com.spacetime.miniapp.dto.response.MessageHomeVO;
import com.spacetime.miniapp.dto.response.MessageReadBatchVO;
import com.spacetime.miniapp.dto.response.MessageReadVO;
import com.spacetime.miniapp.dto.response.MessageUnreadSummaryVO;
import com.spacetime.miniapp.dto.response.MessageWhisperDetailVO;
import com.spacetime.miniapp.dto.response.MessageWhisperPageVO;
import com.spacetime.miniapp.dto.response.SystemMessagePageVO;
import com.spacetime.miniapp.dto.response.WhisperReplyVO;

/** 小程序悄悄话待处理与私信会话查询服务。 */
public interface MiniappMessageService {
    MessageHomeVO home(Long userId);
    MessageUnreadSummaryVO unreadSummary(Long userId);
    MessageWhisperPageVO whispers(Long userId, String direction, String cursor, int size);
    MessageWhisperDetailVO whisperDetail(Long userId, String whisperNo);
    WhisperReplyVO replyWhisper(Long userId, String whisperNo, WhisperReplyReq req);
    MessageConversationPageVO conversations(Long userId, String cursor, int size);
    MessageConversationDetailVO conversationDetail(Long userId, String conversationNo);
    MessageReadVO readConversation(Long userId, String conversationNo, MessageReadReq req);
    ConversationBlockVO blockConversation(Long userId, String conversationNo,
                                          ConversationBlockReq req);
    MessageReadBatchVO readWhispers(Long userId, WhisperReadBatchReq req);
    AssistantMessagePageVO assistantMessages(Long userId, String cursor, int size);
    MessageReadBatchVO readAssistantMessages(Long userId, AssistantMessageReadBatchReq req);
    SystemMessagePageVO systemMessages(Long userId, String cursor, int size);
    MessageReadBatchVO readSystemMessages(Long userId, SystemMessageReadBatchReq req);
}

package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.AssistantMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.ConversationBlockReq;
import com.spacetime.miniapp.dto.request.MessageReadReq;
import com.spacetime.miniapp.dto.request.SystemMessageReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReadBatchReq;
import com.spacetime.miniapp.dto.request.WhisperReplyReq;
import com.spacetime.miniapp.dto.request.WhisperHideAllReq;
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
import com.spacetime.miniapp.dto.response.WhisperHideVO;
import com.spacetime.miniapp.service.MiniappMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** PRD-03 悄悄话回复即匹配与私信会话接口。 */
@RestController
@RequestMapping("/miniapp/message")
@RequiredArgsConstructor
public class MiniappMessageController {
    private final MiniappMessageService messageService;

    @GetMapping("/home")
    public R<MessageHomeVO> home(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(messageService.home(currentUserId(), cursor, size));
    }

    @GetMapping("/unread-summary")
    public R<MessageUnreadSummaryVO> unreadSummary() {
        return R.ok(messageService.unreadSummary(currentUserId()));
    }

    @GetMapping("/whispers")
    public R<MessageWhisperPageVO> whispers(
            @RequestParam String direction,
            @RequestParam(defaultValue = "pending") String bucket,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(messageService.whispers(currentUserId(), direction, bucket, cursor, size));
    }

    @GetMapping("/whispers/{whisperNo}")
    public R<MessageWhisperDetailVO> whisperDetail(@PathVariable String whisperNo) {
        return R.ok(messageService.whisperDetail(currentUserId(), whisperNo));
    }

    @PostMapping("/whispers/read-batch")
    public R<MessageReadBatchVO> readWhispers(@Valid @RequestBody WhisperReadBatchReq req) {
        return R.ok(messageService.readWhispers(currentUserId(), req));
    }

    @DeleteMapping("/whispers/{whisperNo}")
    public R<WhisperHideVO> hideWhisper(@PathVariable String whisperNo) {
        return R.ok(messageService.hideWhisper(currentUserId(), whisperNo));
    }

    @PostMapping("/whispers/received/hide-all")
    public R<WhisperHideVO> hideReceivedWhispers(
            @Valid @RequestBody WhisperHideAllReq req) {
        return R.ok(messageService.hideReceivedWhispers(currentUserId(), req));
    }

    @PostMapping("/whispers/{whisperNo}/reply")
    public R<WhisperReplyVO> replyWhisper(
            @PathVariable String whisperNo,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody WhisperReplyReq req) {
        if (!idempotencyKey.equals(req.getRequestId())) {
            throw new BusinessException(30020, "Idempotency-Key必须与requestId一致");
        }
        return R.ok(messageService.replyWhisper(currentUserId(), whisperNo, req));
    }

    @GetMapping("/conversations")
    public R<MessageConversationPageVO> conversations(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(messageService.conversations(currentUserId(), cursor, size));
    }

    @GetMapping("/conversations/{conversationNo}")
    public R<MessageConversationDetailVO> conversationDetail(
            @PathVariable String conversationNo) {
        return R.ok(messageService.conversationDetail(currentUserId(), conversationNo));
    }

    @PostMapping("/conversations/{conversationNo}/read")
    public R<MessageReadVO> readConversation(
            @PathVariable String conversationNo,
            @Valid @RequestBody MessageReadReq req) {
        return R.ok(messageService.readConversation(currentUserId(), conversationNo, req));
    }

    @PostMapping("/conversations/{conversationNo}/block")
    public R<ConversationBlockVO> blockConversation(
            @PathVariable String conversationNo,
            @Valid @RequestBody ConversationBlockReq req) {
        return R.ok(messageService.blockConversation(currentUserId(), conversationNo, req));
    }

    @GetMapping("/assistant/messages")
    public R<AssistantMessagePageVO> assistantMessages(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(messageService.assistantMessages(currentUserId(), cursor, size));
    }

    @PostMapping("/assistant/messages/read-batch")
    public R<MessageReadBatchVO> readAssistantMessages(
            @Valid @RequestBody AssistantMessageReadBatchReq req) {
        return R.ok(messageService.readAssistantMessages(currentUserId(), req));
    }

    @GetMapping("/system-messages")
    public R<SystemMessagePageVO> systemMessages(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(messageService.systemMessages(currentUserId(), cursor, size));
    }

    @PostMapping("/system-messages/read-batch")
    public R<MessageReadBatchVO> readSystemMessages(
            @Valid @RequestBody SystemMessageReadBatchReq req) {
        return R.ok(messageService.readSystemMessages(currentUserId(), req));
    }

    private Long currentUserId() {
        UserContext context = UserContextHolder.get();
        if (context == null || context.getId() == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return context.getId();
    }
}

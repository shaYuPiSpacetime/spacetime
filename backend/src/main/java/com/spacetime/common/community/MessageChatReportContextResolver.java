package com.spacetime.common.community;

import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/** 根据平台事实解析举报对象，禁止信任客户端提交的用户或正文。 */
@Component
@RequiredArgsConstructor
public class MessageChatReportContextResolver implements ChatReportContextResolver {
    private static final int CHAT_REPORT_UNAVAILABLE = 505016;

    private final AppMessageConversationDao conversationDao;
    private final AppMessageConversationMemberDao memberDao;
    private final AppMessageRecordDao recordDao;
    private final AppMessageWhisperDao whisperDao;
    private final AppUserImAccountDao imAccountDao;

    @Override
    public TrustedChatReportContext resolve(Long reporterId, ChatReportLookup lookup) {
        if (reporterId == null || lookup == null || !StringUtils.hasText(lookup.sourceType())) {
            throw unavailable();
        }
        return switch (lookup.sourceType()) {
            case "message", "private_chat" -> resolveMessage(reporterId, lookup);
            case "conversation" -> resolveConversation(reporterId, lookup);
            case "whisper" -> resolveWhisper(reporterId, lookup);
            default -> throw unavailable();
        };
    }

    private TrustedChatReportContext resolveMessage(Long reporterId, ChatReportLookup lookup) {
        String messageNo = firstText(lookup.targetBizNo(), lookup.messageNo());
        AppMessageRecord target = recordDao.selectByMessageNo(messageNo);
        if (target == null || Objects.equals(target.getSenderUserId(), reporterId)
                || !Objects.equals(target.getReceiverUserId(), reporterId)
                || target.getConversationId() == null) {
            throw unavailable();
        }
        AppMessageConversation conversation = conversationDao.selectById(target.getConversationId());
        AppMessageConversationMember member = requireMember(
                conversation, reporterId, target.getSenderUserId());
        validateTimConversation(lookup.timConversationId(), member.getPeerUserId());
        requireOptionalSame(lookup.timMessageId(), target.getTimMessageId());
        requireOptionalSame(lookup.timMsgKey(), target.getTimMsgKey());

        List<AppMessageRecord> before = new ArrayList<>(recordDao.selectSentBefore(
                conversation.getId(), target.getId(), 5));
        Collections.reverse(before);
        List<Long> evidenceIds = new ArrayList<>(before.stream().map(AppMessageRecord::getId).toList());
        evidenceIds.add(target.getId());
        evidenceIds.addAll(recordDao.selectSentAfter(conversation.getId(), target.getId(), 2)
                .stream().map(AppMessageRecord::getId).toList());
        return trusted(messageNo, target.getSenderUserId(), "message", target.getId(),
                evidenceIds, conversation.getConversationNo());
    }

    private TrustedChatReportContext resolveConversation(Long reporterId, ChatReportLookup lookup) {
        String conversationNo = firstText(lookup.targetBizNo(), lookup.conversationNo());
        AppMessageConversation conversation = conversationDao.selectByConversationNo(conversationNo);
        AppMessageConversationMember member = requireMember(conversation, reporterId, null);
        validateTimConversation(lookup.timConversationId(), member.getPeerUserId());
        List<AppMessageRecord> latest = new ArrayList<>(
                recordDao.selectHistory(conversation.getId(), null, 20));
        Collections.reverse(latest);
        return trusted(conversationNo, member.getPeerUserId(), "conversation", null,
                latest.stream().map(AppMessageRecord::getId).toList(), conversationNo);
    }

    private TrustedChatReportContext resolveWhisper(Long reporterId, ChatReportLookup lookup) {
        String whisperNo = firstText(lookup.targetBizNo(), lookup.whisperNo());
        AppMessageWhisper whisper = whisperDao.selectByWhisperNo(whisperNo);
        if (whisper == null || !Objects.equals(reporterId, whisper.getSenderUserId())
                && !Objects.equals(reporterId, whisper.getReceiverUserId())) {
            throw unavailable();
        }
        Long peerId = Objects.equals(reporterId, whisper.getSenderUserId())
                ? whisper.getReceiverUserId() : whisper.getSenderUserId();
        Long targetMessageId = Objects.equals(reporterId, whisper.getReceiverUserId())
                ? whisper.getRequestMessageId() : whisper.getReplyMessageId();
        if (targetMessageId == null) {
            throw unavailable();
        }
        validateTimConversation(lookup.timConversationId(), peerId);
        List<Long> ids = new ArrayList<>();
        if (whisper.getRequestMessageId() != null) {
            ids.add(whisper.getRequestMessageId());
        }
        if (whisper.getReplyMessageId() != null) {
            ids.add(whisper.getReplyMessageId());
        }
        AppMessageRecord target = recordDao.selectById(targetMessageId);
        if (target == null || !Objects.equals(target.getSenderUserId(), peerId)) {
            throw unavailable();
        }
        requireOptionalSame(lookup.timMessageId(), target.getTimMessageId());
        requireOptionalSame(lookup.timMsgKey(), target.getTimMsgKey());
        return trusted(whisperNo, peerId, "whisper", targetMessageId, ids,
                whisper.getConversationNo());
    }

    private AppMessageConversationMember requireMember(AppMessageConversation conversation,
                                                        Long reporterId, Long expectedPeerId) {
        if (conversation == null) {
            throw unavailable();
        }
        AppMessageConversationMember member = memberDao.selectByConversationAndUser(
                conversation.getId(), reporterId);
        if (member == null || expectedPeerId != null
                && !Objects.equals(member.getPeerUserId(), expectedPeerId)) {
            throw unavailable();
        }
        return member;
    }

    private void validateTimConversation(String submitted, Long peerUserId) {
        if (!StringUtils.hasText(submitted)) {
            return;
        }
        AppUserImAccount account = imAccountDao.selectByUserId(peerUserId);
        if (account == null || !submitted.equals("C2C_" + account.getImUserId())) {
            throw unavailable();
        }
    }

    private void requireOptionalSame(String submitted, String actual) {
        if (StringUtils.hasText(submitted) && !submitted.equals(actual)) {
            throw unavailable();
        }
    }

    private TrustedChatReportContext trusted(String targetNo, Long targetUserId,
                                              String sourceType, Long targetMessageId,
                                              List<Long> evidenceIds, String conversationNo) {
        String metadata = "{\"requestedEvidenceCount\":" + evidenceIds.size() + "}";
        return new TrustedChatReportContext(targetNo, targetUserId, sourceType, metadata,
                targetMessageId, List.copyOf(evidenceIds), conversationNo,
                evidenceIds.isEmpty() ? "partial" : "complete");
    }

    private String firstText(String first, String second) {
        String value = StringUtils.hasText(first) ? first : second;
        if (!StringUtils.hasText(value)) {
            throw unavailable();
        }
        return value;
    }

    private BusinessException unavailable() {
        return new BusinessException(CHAT_REPORT_UNAVAILABLE, "chat_report_unavailable");
    }
}

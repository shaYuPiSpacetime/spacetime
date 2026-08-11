package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageRuleVersionDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.entity.AppMessageRuleVersion;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.GenderEnum;
import com.spacetime.common.enums.MessageConversationStatusEnum;
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.MessageConversationLifecycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

/** 匹配和私信会话的一对一投影实现。 */
@Service
@RequiredArgsConstructor
public class MessageConversationLifecycleServiceImpl implements MessageConversationLifecycleService {
    private static final int MATCH_CONVERSATION_CONFLICT = 30014;
    private static final String FALLBACK_CONFIG_VERSION = "MSG-CFG-INIT-001";

    private final AppMessageConversationDao conversationDao;
    private final AppMessageConversationMemberDao memberDao;
    private final AppMessageRecordDao recordDao;
    private final AppMessageRuleVersionDao ruleDao;
    private final AppUserDao userDao;

    @Override
    @Transactional
    public AppMessageConversation ensureForMatch(AppRelationMatch match, String sourceType,
                                                  LocalDateTime effectiveTime) {
        requireMatch(match);
        LocalDateTime eventTime = effectiveTime == null ? LocalDateTime.now() : effectiveTime;
        AppMessageConversation conversation = conversationDao.selectByMatchIdForUpdate(match.getId());
        if (conversation == null) {
            conversation = conversationDao.selectActivePairForUpdate(
                    match.getUserLowId(), match.getUserHighId());
        }
        if (conversation != null) {
            if (!Objects.equals(conversation.getMatchId(), match.getId())) {
                throw new BusinessException(MATCH_CONVERSATION_CONFLICT,
                        "当前用户对已存在其他有效私信会话");
            }
            ensureMembers(conversation, match);
            return conversation;
        }

        AppMessageRuleVersion rule = ruleDao.selectCurrent("global");
        AppMessageConversation created = new AppMessageConversation();
        created.setConversationNo("CV-" + IdUtil.getSnowflakeNextIdStr());
        created.setTimConversationId("C2C_PAIR_" + match.getUserLowId() + "_" + match.getUserHighId());
        created.setMatchId(match.getId());
        created.setMatchNo(match.getMatchNo());
        created.setUserLowId(match.getUserLowId());
        created.setUserHighId(match.getUserHighId());
        created.setStatus(MessageConversationStatusEnum.ACTIVE.getCode());
        created.setActiveMarker(1);
        created.setConfigVersion(rule == null ? FALLBACK_CONFIG_VERSION : rule.getVersionNo());
        applyFemaleProtection(created, sourceType, rule, eventTime);
        created.setLastMessageTime(eventTime);
        created.setVersion(0);
        try {
            conversationDao.insert(created);
            conversation = created;
        } catch (DuplicateKeyException ex) {
            conversation = conversationDao.selectByMatchIdForUpdate(match.getId());
            if (conversation == null) {
                conversation = conversationDao.selectActivePairForUpdate(
                        match.getUserLowId(), match.getUserHighId());
            }
            if (conversation == null || !Objects.equals(conversation.getMatchId(), match.getId())) {
                throw ex;
            }
        }
        ensureMembers(conversation, match);
        return conversation;
    }

    @Override
    @Transactional
    public void invalidateForMatch(AppRelationMatch match, String reason, LocalDateTime invalidTime) {
        requireMatch(match);
        LocalDateTime eventTime = invalidTime == null ? LocalDateTime.now() : invalidTime;
        conversationDao.invalidateByPair(
                match.getUserLowId(), match.getUserHighId(),
                MessageConversationStatusEnum.INVALID.getCode(), reason, null, eventTime);
        recordDao.schedulePurgeByPair(match.getUserLowId(), match.getUserHighId(), eventTime);
    }

    private void applyFemaleProtection(AppMessageConversation conversation, String sourceType,
                                       AppMessageRuleVersion rule, LocalDateTime eventTime) {
        if (RelationMatchSourceTypeEnum.WHISPER_REPLY.getCode().equals(sourceType)
                || rule == null || !Integer.valueOf(1).equals(rule.getFemaleProtectionEnabled())) {
            conversation.setProtectionEnabled(0);
            return;
        }
        AppUser low = userDao.selectById(conversation.getUserLowId());
        AppUser high = userDao.selectById(conversation.getUserHighId());
        AppUser female = isGender(low, GenderEnum.FEMALE) ? low
                : isGender(high, GenderEnum.FEMALE) ? high : null;
        AppUser male = isGender(low, GenderEnum.MALE) ? low
                : isGender(high, GenderEnum.MALE) ? high : null;
        if (female == null || male == null) {
            conversation.setProtectionEnabled(0);
            return;
        }
        int days = rule.getFemaleProtectionDays() == null ? 3 : rule.getFemaleProtectionDays();
        conversation.setProtectionEnabled(1);
        conversation.setFemaleUserId(female.getId());
        conversation.setMaleUserId(male.getId());
        conversation.setProtectionUntil(eventTime.plusDays(Math.max(1, days)));
    }

    private boolean isGender(AppUser user, GenderEnum gender) {
        return user != null && gender.getCode().equals(user.getGender());
    }

    private void ensureMembers(AppMessageConversation conversation, AppRelationMatch match) {
        ensureMember(conversation, match.getUserLowId(), match.getUserHighId());
        ensureMember(conversation, match.getUserHighId(), match.getUserLowId());
    }

    private void ensureMember(AppMessageConversation conversation, Long userId, Long peerUserId) {
        if (memberDao.selectByConversationAndUser(conversation.getId(), userId) != null) {
            return;
        }
        AppMessageConversationMember member = new AppMessageConversationMember();
        member.setConversationId(conversation.getId());
        member.setConversationNo(conversation.getConversationNo());
        member.setUserId(userId);
        member.setPeerUserId(peerUserId);
        member.setVersion(0);
        try {
            memberDao.insert(member);
        } catch (DuplicateKeyException ex) {
            if (memberDao.selectByConversationAndUser(conversation.getId(), userId) == null) {
                throw ex;
            }
        }
    }

    private void requireMatch(AppRelationMatch match) {
        if (match == null || match.getId() == null || match.getUserLowId() == null
                || match.getUserHighId() == null || match.getMatchNo() == null) {
            throw new BusinessException(MATCH_CONVERSATION_CONFLICT, "匹配事实不完整");
        }
    }
}

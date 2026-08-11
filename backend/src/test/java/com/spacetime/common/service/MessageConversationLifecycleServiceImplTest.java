package com.spacetime.common.service;

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
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import com.spacetime.common.service.impl.MessageConversationLifecycleServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageConversationLifecycleServiceImplTest {
    @Mock private AppMessageConversationDao conversationDao;
    @Mock private AppMessageConversationMemberDao memberDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private AppMessageRuleVersionDao ruleDao;
    @Mock private AppUserDao userDao;

    @Test
    void shouldProvisionProtectedConversationAndBothMembersForMutualLike() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 20, 0);
        AppRelationMatch match = match();
        AppMessageRuleVersion rule = new AppMessageRuleVersion();
        rule.setVersionNo("M03-RULE-V0001");
        rule.setFemaleProtectionEnabled(1);
        rule.setFemaleProtectionDays(3);
        when(ruleDao.selectCurrent("global")).thenReturn(rule);
        when(userDao.selectById(1L)).thenReturn(user(1L, GenderEnum.FEMALE.getCode()));
        when(userDao.selectById(2L)).thenReturn(user(2L, GenderEnum.MALE.getCode()));
        doAnswer(invocation -> {
            AppMessageConversation conversation = invocation.getArgument(0);
            conversation.setId(30L);
            return null;
        }).when(conversationDao).insert(any(AppMessageConversation.class));

        AppMessageConversation result = service().ensureForMatch(
                match, RelationMatchSourceTypeEnum.DOUBLE_LIKE.getCode(), now);

        assertThat(result.getMatchId()).isEqualTo(20L);
        assertThat(result.getTimConversationId()).isEqualTo("C2C_PAIR_1_2");
        assertThat(result.getProtectionEnabled()).isEqualTo(1);
        assertThat(result.getFemaleUserId()).isEqualTo(1L);
        assertThat(result.getMaleUserId()).isEqualTo(2L);
        assertThat(result.getProtectionUntil()).isEqualTo(now.plusDays(3));
        ArgumentCaptor<AppMessageConversationMember> memberCaptor =
                ArgumentCaptor.forClass(AppMessageConversationMember.class);
        verify(memberDao, org.mockito.Mockito.times(2)).insert(memberCaptor.capture());
        assertThat(memberCaptor.getAllValues()).extracting(AppMessageConversationMember::getUserId)
                .containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void shouldInvalidateConversationAndScheduleBodyRetentionTogether() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 20, 0);
        AppRelationMatch match = match();

        service().invalidateForMatch(match, "like_cancelled", now);

        verify(conversationDao).invalidateByPair(
                1L, 2L, "invalid", "like_cancelled", null, now);
        verify(recordDao).schedulePurgeByPair(1L, 2L, now);
    }

    private MessageConversationLifecycleServiceImpl service() {
        return new MessageConversationLifecycleServiceImpl(
                conversationDao, memberDao, recordDao, ruleDao, userDao);
    }

    private AppRelationMatch match() {
        AppRelationMatch match = new AppRelationMatch();
        match.setId(20L);
        match.setMatchNo("MAT-1");
        match.setUserLowId(1L);
        match.setUserHighId(2L);
        match.setPrimarySource(RelationMatchSourceTypeEnum.DOUBLE_LIKE.getCode());
        match.setMatchStatus("matched");
        return match;
    }

    private AppUser user(Long id, String gender) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setGender(gender);
        return user;
    }
}

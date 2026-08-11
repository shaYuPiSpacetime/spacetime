package com.spacetime.common.service;

import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.service.impl.MessageFactReconcileServiceImpl;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MessageFactReconcileServiceImplTest {

    @Test
    void shouldProvisionMissingConversationsFromRecentMatchFacts() {
        AppRelationMatchDao matchDao = mock(AppRelationMatchDao.class);
        MessageConversationLifecycleService lifecycle =
                mock(MessageConversationLifecycleService.class);
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 20, 0);
        AppRelationMatch match = new AppRelationMatch();
        match.setId(20L);
        match.setPrimarySource("double_like");
        match.setMatchedTime(now.minusHours(2));
        when(matchDao.selectActiveMissingConversations(now.minusHours(24), 200))
                .thenReturn(List.of(match));

        int count = new MessageFactReconcileServiceImpl(matchDao, lifecycle)
                .reconcileRecentMatches(now, 200);

        assertThat(count).isEqualTo(1);
        verify(lifecycle).ensureForMatch(match, "double_like", match.getMatchedTime());
    }
}

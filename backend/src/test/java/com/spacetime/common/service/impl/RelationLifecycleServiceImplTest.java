package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppRelationMatchPopupDao;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 关系生命周期批量失效服务测试。 */
@ExtendWith(MockitoExtension.class)
class RelationLifecycleServiceImplTest {
    @Mock private AppRelationLikeDao likeDao;
    @Mock private AppRelationVisitDao visitDao;
    @Mock private AppRelationMatchDao matchDao;
    @Mock private AppRelationMatchSourceDao matchSourceDao;
    @Mock private AppRelationMatchPopupDao matchPopupDao;
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private AppMessageConversationDao conversationDao;
    @Mock private AppMessageRecordDao messageRecordDao;
    @InjectMocks private RelationLifecycleServiceImpl service;

    @Test
    void invalidatesAllFactsForAccountLifecycleEventWithoutDeletingHistory() {
        LocalDateTime time = LocalDateTime.of(2026, 7, 21, 11, 0);
        AppRelationMatch match = new AppRelationMatch();
        match.setId(30L);
        when(matchDao.selectActiveByUser(1L)).thenReturn(List.of(match));

        service.invalidateByUser(1L, RelationInvalidReasonEnum.ACCOUNT_FROZEN, time);

        verify(likeDao).invalidateByUser(1L, "account_frozen", time);
        verify(visitDao).invalidateByUser(1L, "account_frozen", time);
        verify(whisperDao).invalidateByUser(1L, "account_frozen", time);
        verify(conversationDao).invalidateByUser(1L, "invalid", "account_frozen", time);
        verify(messageRecordDao).schedulePurgeByUser(1L, time);
        verify(matchSourceDao).invalidateActiveByMatchIds(List.of(30L), "account_frozen", time);
        verify(matchPopupDao).cancelPendingByMatchIds(List.of(30L), time);
        verify(matchDao).invalidateByIds(List.of(30L), "account_frozen", time);
    }

    @Test
    void invalidatesBothDirectionsForBlacklistPair() {
        LocalDateTime time = LocalDateTime.of(2026, 7, 21, 11, 5);
        AppRelationMatch match = new AppRelationMatch();
        match.setId(31L);
        when(matchDao.selectActivePair(2L, 9L)).thenReturn(match);

        service.invalidateByPair(9L, 2L, RelationInvalidReasonEnum.BLOCKED, time);

        verify(likeDao).invalidateByPair(2L, 9L, "blocked", time);
        verify(visitDao).invalidateByPair(2L, 9L, "blocked", time);
        verify(whisperDao).invalidateByPair(2L, 9L, "blocked", time);
        verify(conversationDao).invalidateByPair(2L, 9L, "blocked", "blocked", 9L, time);
        verify(messageRecordDao).schedulePurgeByPair(2L, 9L, time);
        verify(matchSourceDao).invalidateActiveByMatchIds(List.of(31L), "blocked", time);
        verify(matchPopupDao).cancelPendingByMatchIds(List.of(31L), time);
        verify(matchDao).invalidateByIds(List.of(31L), "blocked", time);
    }
}

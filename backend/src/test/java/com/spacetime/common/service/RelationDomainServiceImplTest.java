package com.spacetime.common.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppRelationMatchPopupDao;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.dao.AppRelationVisitCursorDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppRelationMatchSource;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.entity.AppRelationVisitCursor;
import com.spacetime.common.entity.AppRelationVisitEvent;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.enums.RelationMatchPopupActionEnum;
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import com.spacetime.common.enums.RelationSourceSceneEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.impl.RelationDomainServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 关系领域核心状态机测试。 */
@ExtendWith(MockitoExtension.class)
@DisplayName("关系领域状态机")
class RelationDomainServiceImplTest {

    @Mock private AppRelationLikeDao likeDao;
    @Mock private AppRelationVisitDao visitDao;
    @Mock private AppRelationVisitEventDao visitEventDao;
    @Mock private AppRelationVisitCursorDao visitCursorDao;
    @Mock private AppRelationMatchDao matchDao;
    @Mock private AppRelationMatchSourceDao matchSourceDao;
    @Mock private AppRelationMatchPopupDao matchPopupDao;
    @InjectMocks private RelationDomainServiceImpl service;

    @Test
    @DisplayName("重复访客事件应幂等返回且不增加PV")
    void duplicateVisitEventShouldNotIncreasePv() {
        AppRelationVisitEvent event = new AppRelationVisitEvent();
        event.setVisitId(10L);
        event.setVisitorUserId(1L);
        event.setTargetUserId(2L);
        AppRelationVisit visit = visit(10L, 2, "fate", LocalDateTime.of(2026, 7, 21, 12, 0));
        when(visitEventDao.selectOne(any(LambdaQueryWrapper.class))).thenReturn(event);
        when(visitDao.selectById(10L)).thenReturn(visit);

        AppRelationVisit result = service.recordVisit("EVT-1", 1L, 2L, "featured",
                LocalDateTime.of(2026, 7, 21, 12, 5));

        assertThat(result).isSameAs(visit);
        assertThat(result.getPvCount()).isEqualTo(2);
        verify(visitEventDao, never()).insert(any());
        verify(visitDao, never()).updateById(any());
    }

    @Test
    @DisplayName("重复访客事件号被其他用户对占用时应拒绝串用")
    void duplicateVisitEventShouldRejectDifferentUserPair() {
        AppRelationVisitEvent event = new AppRelationVisitEvent();
        event.setVisitId(10L);
        event.setVisitorUserId(8L);
        event.setTargetUserId(9L);
        when(visitEventDao.selectOne(any(LambdaQueryWrapper.class))).thenReturn(event);

        assertThatThrownBy(() -> service.recordVisit("EVT-COLLISION", 1L, 2L, "featured",
                LocalDateTime.of(2026, 7, 21, 12, 5)))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(20008);
        verify(visitDao, never()).selectById(any());
    }

    @Test
    @DisplayName("30分钟内访问应归并并保留首次来源")
    void visitWithinThirtyMinutesShouldMergeAndKeepFirstSource() {
        LocalDateTime previous = LocalDateTime.of(2026, 7, 21, 12, 0);
        AppRelationVisitCursor cursor = cursor(10L, previous);
        AppRelationVisit visit = visit(10L, 2, "fate", previous);
        when(visitEventDao.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(visitCursorDao.selectPairForUpdate(1L, 2L)).thenReturn(cursor);
        when(visitDao.selectById(10L)).thenReturn(visit);

        AppRelationVisit result = service.recordVisit("EVT-2", 1L, 2L, "featured",
                previous.plusMinutes(29).plusSeconds(59));

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getPvCount()).isEqualTo(3);
        assertThat(result.getSourceScene()).isEqualTo("fate");
        verify(visitDao).updateById(visit);
        verify(visitDao, never()).insert(any());
        verify(visitEventDao).updateById(any(AppRelationVisitEvent.class));
        verify(visitCursorDao).updateById(cursor);
    }

    @Test
    @DisplayName("恰好30分钟应创建新的展示记录")
    void visitAtThirtyMinutesShouldCreateNewDisplayRecord() {
        LocalDateTime previous = LocalDateTime.of(2026, 7, 21, 12, 0);
        AppRelationVisitCursor cursor = cursor(10L, previous);
        when(visitEventDao.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(visitCursorDao.selectPairForUpdate(1L, 2L)).thenReturn(cursor);
        doAnswer(invocation -> {
            AppRelationVisit entity = invocation.getArgument(0);
            entity.setId(20L);
            return null;
        }).when(visitDao).insert(any(AppRelationVisit.class));

        AppRelationVisit result = service.recordVisit("EVT-3", 1L, 2L, "featured", previous.plusMinutes(30));

        assertThat(result.getId()).isEqualTo(20L);
        assertThat(result.getPvCount()).isEqualTo(1);
        assertThat(result.getSourceScene()).isEqualTo("featured");
        assertThat(cursor.getCurrentVisitId()).isEqualTo(20L);
        verify(visitDao).insert(result);
    }

    @Test
    @DisplayName("首个匹配来源应创建单一匹配和双方弹窗")
    void firstMatchSourceShouldCreateMatchAndTwoPopups() {
        when(matchSourceDao.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(matchDao.selectActivePairForUpdate(2L, 9L)).thenReturn(null);
        doAnswer(invocation -> {
            AppRelationMatch entity = invocation.getArgument(0);
            entity.setId(100L);
            return null;
        }).when(matchDao).insert(any(AppRelationMatch.class));

        AppRelationMatch result = service.addMatchSource(9L, 2L,
                RelationMatchSourceTypeEnum.DOUBLE_LIKE.getCode(), "LIK-1|LIK-2",
                LocalDateTime.of(2026, 7, 21, 13, 0));

        assertThat(result.getUserLowId()).isEqualTo(2L);
        assertThat(result.getUserHighId()).isEqualTo(9L);
        assertThat(result.getPrimarySource()).isEqualTo("double_like");
        verify(matchSourceDao).insert(any());
        verify(matchPopupDao, org.mockito.Mockito.times(2)).insert(any());
    }

    @Test
    @DisplayName("后续匹配来源只追加来源不重复生成匹配和弹窗")
    void additionalMatchSourceShouldNotCreateAnotherLifecycleOrPopup() {
        AppRelationMatch match = new AppRelationMatch();
        match.setId(100L);
        match.setMatchNo("MAT-1");
        when(matchSourceDao.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(matchDao.selectActivePairForUpdate(2L, 9L)).thenReturn(match);

        AppRelationMatch result = service.addMatchSource(2L, 9L,
                RelationMatchSourceTypeEnum.WHISPER_REPLY.getCode(), "WHI-1",
                LocalDateTime.of(2026, 7, 21, 13, 5));

        assertThat(result).isSameAs(match);
        verify(matchDao, never()).insert(any());
        verify(matchPopupDao, never()).insert(any());
        verify(matchSourceDao).insert(any());
    }

    @Test
    @DisplayName("最后一个来源撤销应使匹配失效并取消待展示弹窗")
    void revokingLastSourceShouldInvalidateMatchAndPendingPopups() {
        AppRelationMatchSource source = new AppRelationMatchSource();
        source.setId(200L);
        source.setMatchId(100L);
        source.setSourceStatus("active");
        AppRelationMatch match = new AppRelationMatch();
        match.setId(100L);
        match.setMatchStatus("matched");
        match.setActiveMarker(1);
        when(matchSourceDao.selectOne(any(LambdaQueryWrapper.class))).thenReturn(source);
        when(matchDao.selectByIdForUpdate(100L)).thenReturn(match);
        when(matchSourceDao.selectByIdForUpdate(200L)).thenReturn(source);
        when(matchSourceDao.count(any(LambdaQueryWrapper.class))).thenReturn(0L);

        service.revokeMatchSource(RelationMatchSourceTypeEnum.DOUBLE_LIKE.getCode(), "LIK-1|LIK-2",
                RelationInvalidReasonEnum.LIKE_CANCELLED, LocalDateTime.of(2026, 7, 21, 14, 0));

        assertThat(match.getMatchStatus()).isEqualTo("invalid");
        assertThat(match.getActiveMarker()).isNull();
        verify(matchDao).selectByIdForUpdate(100L);
        verify(matchSourceDao).selectByIdForUpdate(200L);
        verify(matchDao).updateById(match);
        verify(matchPopupDao).cancelPendingByMatchId(100L, LocalDateTime.of(2026, 7, 21, 14, 0));
    }

    @Test
    @DisplayName("弹窗送达不算已读，主动动作回执才标记已读")
    void popupShouldRequireExplicitReadAction() {
        com.spacetime.common.entity.AppRelationMatchPopup popup = new com.spacetime.common.entity.AppRelationMatchPopup();
        popup.setPopupStatus("pending");
        when(matchPopupDao.selectOne(any(LambdaQueryWrapper.class))).thenReturn(popup, popup);
        LocalDateTime delivered = LocalDateTime.of(2026, 7, 21, 15, 0);

        service.markPopupDelivered("MAT-1", 2L, delivered);
        assertThat(popup.getPopupStatus()).isEqualTo("pending");
        assertThat(popup.getDeliveredTime()).isEqualTo(delivered);

        service.markPopupRead("MAT-1", 2L, RelationMatchPopupActionEnum.CLOSE.getCode(), delivered.plusMinutes(1));
        assertThat(popup.getPopupStatus()).isEqualTo("read");
        assertThat(popup.getReadAction()).isEqualTo("close");
    }

    private AppRelationVisit visit(Long id, int pv, String source, LocalDateTime lastTime) {
        AppRelationVisit visit = new AppRelationVisit();
        visit.setId(id);
        visit.setPvCount(pv);
        visit.setSourceScene(source);
        visit.setVisitStatus("visible");
        visit.setLastVisitTime(lastTime);
        return visit;
    }

    private AppRelationVisitCursor cursor(Long visitId, LocalDateTime lastTime) {
        AppRelationVisitCursor cursor = new AppRelationVisitCursor();
        cursor.setId(5L);
        cursor.setCurrentVisitId(visitId);
        cursor.setLastVisitTime(lastTime);
        return cursor;
    }
}

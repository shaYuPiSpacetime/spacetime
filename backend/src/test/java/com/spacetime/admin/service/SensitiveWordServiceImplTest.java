package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.SensitiveWordSaveReq;
import com.spacetime.admin.service.impl.SensitiveWordServiceImpl;
import com.spacetime.common.dao.SensitiveWordDao;
import com.spacetime.common.entity.ContentSensitiveWord;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** L3-01/02/03/05：精确查重、固定 trim、写入锁与提交后刷新。 */
class SensitiveWordServiceImplTest {
    private final SensitiveWordDao dao=mock(SensitiveWordDao.class);
    private final LocalSensitiveWordService local=mock(LocalSensitiveWordService.class);
    private final AfterCommitExecutor after=mock(AfterCommitExecutor.class);
    private final SensitiveWordServiceImpl service=new SensitiveWordServiceImpl(dao,local,after);
    private SensitiveWordSaveReq req(String word) {
        var r=new SensitiveWordSaveReq();r.setWord(word);r.setCategoryCode("OTHER");return r;
    }
    @Test void emptyFiltersUseTheSameFixedWhitespaceBoundary() {
        when(dao.page(1,20,null,null,null)).thenReturn(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(1,20));
        for (String empty : new String[]{"", " \t", "\u0085\u00a0\u3000"}) service.page(1,20,null,empty,empty);
        verify(dao,times(3)).page(1,20,null,null,null);
        assertThatThrownBy(()->service.page(1,20,null,"\u200b",null)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->service.page(1,20,null,null,"UNKNOWN")).isInstanceOf(BusinessException.class);
    }

    @Test void editClearsRemarkExcludesSelfAndPreservesRawCase() {
        var row=new ContentSensitiveWord();row.setId(4L);row.setRemark("old");row.setWord("A");
        when(dao.lockRevision()).thenReturn(1L);when(dao.findCurrent(4L)).thenReturn(row);
        var r=req("Ａ b");r.setStatus("DISABLED");r.setRemark(null);
        service.update(4L,r);
        var order=inOrder(dao);order.verify(dao).lockRevision();order.verify(dao).findCurrent(4L);order.verify(dao).findDuplicate("Ａ b",4L);
        var capture=ArgumentCaptor.forClass(ContentSensitiveWord.class);order.verify(dao).update(capture.capture());
        assertThat(capture.getValue().getRemark()).isNull();assertThat(capture.getValue().getWord()).isEqualTo("Ａ b");
    }
    @Test void failedWriteNeverBumpsRevisionOrRegistersRefresh() {
        when(dao.lockRevision()).thenReturn(1L);doThrow(new IllegalStateException()).when(dao).insert(any());
        assertThatThrownBy(()->service.create(req("test"))).isInstanceOf(IllegalStateException.class);
        verify(dao,never()).bumpRevision();verifyNoInteractions(after);
    }
    @Test void nonexistentTargetsNeverChangeAnything() {
        when(dao.lockRevision()).thenReturn(1L);
        var r=req("word");r.setStatus("ENABLED");
        assertThatThrownBy(()->service.update(7L,r)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->service.changeStatus(7L,"ENABLED")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->service.delete(7L)).isInstanceOf(BusinessException.class);
        verify(dao,never()).bumpRevision();verifyNoInteractions(after);
    }
    @Test void trimsFixedUnicodeSetAndLocksBeforeDuplicateRead() {
        when(dao.lockRevision()).thenReturn(1L);
        service.create(req("\u0085\u00a0\u3000 A b \u205f"));
        var order=inOrder(dao);
        order.verify(dao).lockRevision(); order.verify(dao).findDuplicate("A b",null);
        var captor=ArgumentCaptor.forClass(ContentSensitiveWord.class);
        order.verify(dao).insert(captor.capture());order.verify(dao).bumpRevision();
        assertThat(captor.getValue().getWord()).isEqualTo("A b");
        assertThat(captor.getValue().getStatus()).isEqualTo("ENABLED");
        verifyNoInteractions(local);
        var callback=ArgumentCaptor.forClass(Runnable.class);verify(after).execute(callback.capture());
        callback.getValue().run();verify(local).requestRefresh();
    }
    @Test void duplicateIncludesDisabledAndNoWrites() {
        when(dao.lockRevision()).thenReturn(1L);when(dao.findDuplicate("word",null)).thenReturn(new ContentSensitiveWord());
        assertThatThrownBy(()->service.create(req("word"))).isInstanceOf(BusinessException.class);
        verify(dao,never()).insert(any());verify(dao,never()).bumpRevision();verifyNoInteractions(after);
    }
    @Test void missingRevisionFailsClosed() {
        assertThatThrownBy(()->service.create(req("word"))).isInstanceOf(BusinessException.class);
        verify(dao,never()).findDuplicate(any(),any());verifyNoInteractions(after);
    }
    @Test void statusPatchOnlyChangesStatusAndSameStateIsIdempotent() {
        var row=new ContentSensitiveWord();row.setId(4L);row.setStatus("ENABLED");
        when(dao.lockRevision()).thenReturn(1L);when(dao.findCurrent(4L)).thenReturn(row);
        service.changeStatus(4L,"ENABLED");verify(dao,never()).bumpRevision();
        service.changeStatus(4L,"DISABLED");verify(dao).updateStatus(4L,"DISABLED");
        verify(dao,never()).update(any());verify(dao).bumpRevision();
    }
    @Test void rejectsEmptyLongInvalidAndKeepsZeroWidthCharacter() {
        for(String word:new String[]{"\u0085\u3000", "x".repeat(257)})
            assertThatThrownBy(()->service.create(req(word))).isInstanceOf(BusinessException.class);
        var r=req("ok");r.setCategoryCode("UNKNOWN");assertThatThrownBy(()->service.create(r)).isInstanceOf(BusinessException.class);
        when(dao.lockRevision()).thenReturn(1L);service.create(req("\u200b"));verify(dao).findDuplicate("\u200b",null);
    }
    @Test void refreshFailureCannotTurnSavedWriteIntoFailure() {
        when(dao.lockRevision()).thenReturn(1L);doAnswer(a->{a.<Runnable>getArgument(0).run();return null;}).when(after).execute(any());
        doThrow(new IllegalStateException()).when(local).requestRefresh();
        assertThatCode(()->service.create(req("ok"))).doesNotThrowAnyException();
    }
}

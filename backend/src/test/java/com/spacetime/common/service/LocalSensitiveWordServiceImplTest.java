package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.community.CommunitySecurityConclusion;
import com.spacetime.common.dao.SensitiveWordReadDao;
import com.spacetime.common.entity.ContentSensitiveWord;
import com.spacetime.common.service.impl.LocalSensitiveWordServiceImpl;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.concurrent.Executors;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** L3-04/05/06：词库匹配、版本刷新与异常边界。 */
class LocalSensitiveWordServiceImplTest {
    private final SensitiveWordReadDao dao = mock(SensitiveWordReadDao.class);
    private final LocalSensitiveWordService service = new LocalSensitiveWordServiceImpl(dao, new ObjectMapper());

    @org.junit.jupiter.api.AfterEach
    void close(){((LocalSensitiveWordServiceImpl)service).close();}

    @Test
    void timedOutCallerDoesNotCancelSharedBuild() throws Exception {
        var release=new java.util.concurrent.CountDownLatch(1);
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenAnswer(a->{release.await();return List.of(word(1,"word","OTHER"));});
        try {
            assertThat(service.checkText("word").conclusion()).isEqualTo(CommunitySecurityConclusion.UNAVAILABLE);
        } finally {release.countDown();}
        assertThat(service.checkText("word").conclusion()).isEqualTo(CommunitySecurityConclusion.REJECT);
        verify(dao,times(1)).selectEnabled();
    }

    @Test
    void changingRevisionDiscardsMixedBuildAndUsesFreshRows() {
        when(dao.currentRevision()).thenReturn(1L,1L,2L,2L,2L);
        when(dao.selectEnabled()).thenReturn(List.of(word(1,"old","OTHER")),List.of(word(2,"new","OTHER")));
        assertThat(service.checkText("new").providerCode()).isEqualTo("local_sensitive_word:2");
        assertThat(service.checkText("old").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        verify(dao,times(2)).selectEnabled();
    }

    @Test
    void failedBuildCoolsDownAndRecoversWithoutRestart() throws Exception {
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenThrow(new IllegalStateException()).thenReturn(List.of(word(1,"word","OTHER")));
        assertThat(service.checkText("word").conclusion()).isEqualTo(CommunitySecurityConclusion.UNAVAILABLE);
        assertThat(service.checkText("word").conclusion()).isEqualTo(CommunitySecurityConclusion.UNAVAILABLE);
        verify(dao,times(1)).selectEnabled();
        Thread.sleep(1050);
        assertThat(service.checkText("word").conclusion()).isEqualTo(CommunitySecurityConclusion.REJECT);
    }

    @Test
    void disablingOnlyOneNormalizedAliasRetainsTheOther() {
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenReturn(List.of(word(2,"abc","ADVERTISEMENT"),word(1,"ＡＢＣ","OTHER")));
        assertThat(service.checkText("abc").providerCode()).isEqualTo("local_sensitive_word:1");
        when(dao.currentRevision()).thenReturn(2L);
        when(dao.selectEnabled()).thenReturn(List.of(word(2,"abc","ADVERTISEMENT")));
        assertThat(service.checkText("abc").providerCode()).isEqualTo("local_sensitive_word:2");
        when(dao.currentRevision()).thenReturn(3L);when(dao.selectEnabled()).thenReturn(List.of());
        assertThat(service.checkText("abc").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
    }

    @Test
    void normalizesWidthAndCaseAndSelectsLowestIdCategory() throws Exception {
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenReturn(List.of(word(1, "ＡＢＣ", "OTHER"), word(2, "abc", "ADVERTISEMENT")));
        var result = service.checkText("这里有AbC内容");
        assertThat(result.conclusion()).isEqualTo(CommunitySecurityConclusion.REJECT);
        assertThat(result.providerCode()).isEqualTo("local_sensitive_word:1");
        var evidence = new ObjectMapper().readTree(result.evidenceJson());
        assertThat(evidence.path("word").asText()).isEqualTo("ＡＢＣ");
        assertThat(evidence.path("categoryCode").asText()).isEqualTo("OTHER");
        assertThat(result.detail()).isEqualTo("local_sensitive_word_hit");
        assertThat(evidence.path("revision").asLong()).isEqualTo(1);
    }

    @Test
    void treatsRegexSymbolsAsLiteralAndKeepsInternalSpaces() {
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenReturn(List.of(word(1, "a.b", "OTHER"), word(2, "danger word", "OTHER")));
        assertThat(service.checkText("axb dangerword").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        assertThat(service.checkText("含a.b原文").conclusion()).isEqualTo(CommunitySecurityConclusion.REJECT);
        assertThat(service.checkText("含danger word原文").conclusion()).isEqualTo(CommunitySecurityConclusion.REJECT);
    }

    @Test
    void matchesOverlappingSingleUnicodeAndLongWords() {
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenReturn(List.of(word(1, "aba", "OTHER"), word(2, "babx", "OTHER"), word(3, "𠮷", "OTHER"), word(4, "z".repeat(107), "ILLEGAL_URL")));
        for (String text : List.of("aababx", "你好𠮷先生", "z".repeat(107))) {
            assertThat(service.checkText(text).conclusion()).isEqualTo(CommunitySecurityConclusion.REJECT);
        }
        assertThat(service.checkText("z".repeat(106)).conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
    }

    @Test
    void reusesIndexThenRefreshesAfterDisableOrDelete() {
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenReturn(List.of(word(1, "拦截示例", "OTHER")));
        assertThat(service.checkText("拦截示例").conclusion()).isEqualTo(CommunitySecurityConclusion.REJECT);
        assertThat(service.checkText("普通文本").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        verify(dao, times(1)).selectEnabled();
        when(dao.currentRevision()).thenReturn(2L);
        when(dao.selectEnabled()).thenReturn(List.of());
        assertThat(service.checkText("拦截示例").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        verify(dao, times(2)).selectEnabled();
    }

    @Test
    void missingRevisionOrFailedRebuildIsUnavailable() {
        when(dao.currentRevision()).thenReturn(null);
        assertThat(service.checkText("普通文本").conclusion()).isEqualTo(CommunitySecurityConclusion.UNAVAILABLE);
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenThrow(new IllegalStateException("offline"));
        assertThat(service.checkText("普通文本").conclusion()).isEqualTo(CommunitySecurityConclusion.UNAVAILABLE);
    }

    @Test
    void neverUsesStaleCacheWhenRevisionReadFails() {
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenReturn(List.of());
        assertThat(service.checkText("正常").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        when(dao.currentRevision()).thenThrow(new IllegalStateException("offline"));
        assertThat(service.checkText("正常").conclusion()).isEqualTo(CommunitySecurityConclusion.UNAVAILABLE);
    }

    @Test
    void publishesOneCompleteIndexForConcurrentRequests() throws Exception {
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenReturn(List.of(word(1, "并发词", "OTHER")));
        try (var pool = Executors.newFixedThreadPool(8)) {
            var jobs = java.util.stream.IntStream.range(0, 32)
                    .<java.util.concurrent.Callable<CommunitySecurityConclusion>>mapToObj(i -> () -> service.checkText("并发词").conclusion()).toList();
            for (var future : pool.invokeAll(jobs)) assertThat(future.get()).isEqualTo(CommunitySecurityConclusion.REJECT);
        }
        verify(dao, times(1)).selectEnabled();
    }

    @Test
    void emptyTextDoesNotReadDatabase() {
        assertThat(service.checkText(null).conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        assertThat(service.checkText(" \n").conclusion()).isEqualTo(CommunitySecurityConclusion.PASS);
        verifyNoInteractions(dao);
    }

    @Test
    void diagnosticsSeparateEnabledWordsFromNormalizedKeysAndRemainImmutable() {
        var impl=(LocalSensitiveWordServiceImpl)service;
        assertThat(impl.diagnostics().lastSuccess()).isNull();
        when(dao.currentRevision()).thenReturn(4L);
        when(dao.selectEnabled()).thenReturn(List.of(word(1,"ＡＢＣ","OTHER"),word(2,"abc","OTHER")));
        service.checkText("abc");
        var stats=impl.diagnostics();
        assertThat(stats.revision()).isEqualTo(4L);
        assertThat(stats.enabledWordCount()).isEqualTo(2);
        assertThat(stats.normalizedKeyCount()).isEqualTo(1);
        assertThat(stats.buildCount()).isEqualTo(1);
        assertThat(stats.successfulBuildCount()).isEqualTo(1);
        assertThat(stats.lastBuildMillis()).isGreaterThanOrEqualTo(0);
        assertThat(stats.lastSuccess()).isNotNull();
        org.assertj.core.api.Assertions.assertThatThrownBy(()->stats.skipCounts().clear()).isInstanceOf(UnsupportedOperationException.class);
        service.checkText("abc");
        assertThat(impl.diagnostics().buildCount()).isEqualTo(1);
    }

    @Test
    void diagnosticsBoundFailureReasonsAndRecoverSuccessfulTimestamp() throws Exception {
        var impl=(LocalSensitiveWordServiceImpl)service;
        when(dao.currentRevision()).thenReturn(null);
        service.checkText("private body");
        assertThat(impl.diagnostics().skipCounts().get(LocalSensitiveWordServiceImpl.SkipReason.REVISION_MISSING)).isEqualTo(1L);
        when(dao.currentRevision()).thenReturn(1L);
        when(dao.selectEnabled()).thenThrow(new IllegalStateException("arbitrary private database failure"))
                .thenReturn(List.of(word(1,"abc","OTHER")));
        service.checkText("private body");service.checkText("private body");
        assertThat(impl.diagnostics().skipCounts().get(LocalSensitiveWordServiceImpl.SkipReason.BUILD_FAILED)).isEqualTo(1L);
        assertThat(impl.diagnostics().skipCounts().get(LocalSensitiveWordServiceImpl.SkipReason.COOLDOWN)).isEqualTo(1L);
        assertThat(impl.diagnostics().lastSuccess()).isNull();
        assertThat(impl.diagnostics().skipCounts()).hasSize(LocalSensitiveWordServiceImpl.SkipReason.values().length);
        Thread.sleep(1050);
        assertThat(service.checkText("abc").conclusion()).isEqualTo(CommunitySecurityConclusion.REJECT);
        assertThat(impl.diagnostics().lastSuccess()).isNotNull();
        assertThat(impl.diagnostics().buildCount()).isEqualTo(2L);
        assertThat(impl.diagnostics().successfulBuildCount()).isEqualTo(1L);
    }

    private ContentSensitiveWord word(long id, String value, String category) {
        var word = new ContentSensitiveWord();
        word.setId(id); word.setWord(value); word.setCategoryCode(category); word.setStatus("ENABLED");
        return word;
    }
}

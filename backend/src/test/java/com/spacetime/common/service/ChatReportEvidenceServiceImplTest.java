package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.community.ChatEvidenceSnapshot;
import com.spacetime.common.community.TrustedChatReportContext;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.CommunityReportEvidenceDao;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.CommunityReport;
import com.spacetime.common.entity.CommunityReportEvidence;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.provider.SensitiveTextCipher;
import com.spacetime.common.service.impl.ChatReportEvidenceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("聊天举报证据冻结")
class ChatReportEvidenceServiceImplTest {
    @Mock private AppMessageRecordDao recordDao;
    @Mock private CommunityReportEvidenceDao evidenceDao;
    @Mock private SensitiveTextCipher cipher;

    private ChatReportEvidenceServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service = new ChatReportEvidenceServiceImpl(
                recordDao, evidenceDao, cipher, new ObjectMapper());
        now = LocalDateTime.of(2026, 8, 10, 12, 0);
    }

    @Test
    @DisplayName("正文存在时复制为案件独立密文且不改消息主表")
    void freezeShouldEncryptIndependentEvidence() {
        AppMessageRecord target = message(20L, "MSG-20", "原始举报正文");
        when(recordDao.selectByIds(List.of(20L))).thenReturn(List.of(target));
        when(evidenceDao.selectByReportId(7L)).thenReturn(List.of());
        when(cipher.encrypt("原始举报正文")).thenReturn(
                new EncryptedMessageContent(new byte[]{1}, new byte[12], "v1", "hmac-1"));
        CommunityReport report = report();
        TrustedChatReportContext context = new TrustedChatReportContext(
                "MSG-20", 2L, "message", "{}", 20L, List.of(20L), "CV-10", "complete");

        ChatEvidenceSnapshot result = service.freeze(report, context, now);

        ArgumentCaptor<CommunityReportEvidence> captor =
                ArgumentCaptor.forClass(CommunityReportEvidence.class);
        verify(evidenceDao).insert(captor.capture());
        assertThat(captor.getValue().getEvidenceType()).isEqualTo("target");
        assertThat(captor.getValue().getContentHmac()).isEqualTo("hmac-1");
        assertThat(captor.getValue().getRetainUntil()).isEqualTo(now.plusYears(3));
        assertThat(result.snapshotStatus()).isEqualTo("complete");
        assertThat(result.evidenceCount()).isEqualTo(1);
        assertThat(target.getContentText()).isEqualTo("原始举报正文");
    }

    private CommunityReport report() {
        CommunityReport value = new CommunityReport();
        value.setId(7L);
        value.setReportNo("RPT-7");
        return value;
    }

    private AppMessageRecord message(Long id, String no, String content) {
        AppMessageRecord value = new AppMessageRecord();
        value.setId(id);
        value.setMessageNo(no);
        value.setConversationNo("CV-10");
        value.setSenderUserId(2L);
        value.setReceiverUserId(1L);
        value.setMessageType("text");
        value.setContentText(content);
        value.setProviderSentAt(now.minusMinutes(1));
        return value;
    }
}

package com.spacetime.common.service;

import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.service.impl.MessageWhisperReplyReconcileServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("悄悄话回复状态补偿")
class MessageWhisperReplyReconcileServiceImplTest {
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private MessageDomainService messageDomainService;

    private MessageWhisperReplyReconcileServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        service = new MessageWhisperReplyReconcileServiceImpl(
                whisperDao, recordDao, messageDomainService);
        now = LocalDateTime.of(2026, 9, 28, 12, 0);
    }

    @Test
    @DisplayName("回复已投递但申请仍为pending时应重入领域状态机完成会话")
    void shouldFinalizeDeliveredReplyReservation() {
        AppMessageWhisper whisper = reservedWhisper(10L, 2L, "WSP-1", "reply-1", 20L);
        AppMessageRecord reply = new AppMessageRecord();
        reply.setId(20L);
        reply.setContentText("你好");
        when(whisperDao.selectReplyReservationsReadyToFinalize(0L, 100))
                .thenReturn(List.of(whisper));
        when(whisperDao.selectReplyReservationsReadyToRelease(0L, 100)).thenReturn(List.of());
        when(recordDao.selectById(20L)).thenReturn(reply);

        int affected = service.reconcile(now, 100);

        assertThat(affected).isEqualTo(1);
        verify(messageDomainService).replyWhisper(2L, "WSP-1", "reply-1", "你好", now);
    }

    @Test
    @DisplayName("回复投递已永久失败时应释放预占允许用户重试")
    void shouldReleaseFailedReplyReservation() {
        AppMessageWhisper whisper = reservedWhisper(10L, 2L, "WSP-1", "reply-1", 20L);
        when(whisperDao.selectReplyReservationsReadyToFinalize(0L, 100)).thenReturn(List.of());
        when(whisperDao.selectReplyReservationsReadyToRelease(0L, 100))
                .thenReturn(List.of(whisper));
        when(whisperDao.releaseFailedReplyReservation(10L, "reply-1", 20L, now))
                .thenReturn(1);

        int affected = service.reconcile(now, 100);

        assertThat(affected).isEqualTo(1);
        verify(whisperDao).releaseFailedReplyReservation(10L, "reply-1", 20L, now);
    }

    @Test
    @DisplayName("单条毒记录失败不得阻塞下一批已投递回复")
    void shouldAdvanceCursorPastPoisonRecord() {
        AppMessageWhisper poison = reservedWhisper(10L, 2L, "WSP-1", "reply-1", 20L);
        AppMessageWhisper recoverable = reservedWhisper(30L, 4L, "WSP-2", "reply-2", 40L);
        AppMessageRecord reply = new AppMessageRecord();
        reply.setId(40L);
        reply.setContentText("已回复");
        when(whisperDao.selectReplyReservationsReadyToFinalize(0L, 1))
                .thenReturn(List.of(poison));
        when(whisperDao.selectReplyReservationsReadyToFinalize(10L, 1))
                .thenReturn(List.of(recoverable));
        when(whisperDao.selectReplyReservationsReadyToRelease(0L, 1))
                .thenReturn(List.of());
        when(recordDao.selectById(20L)).thenReturn(null);
        when(recordDao.selectById(40L)).thenReturn(reply);

        assertThat(service.reconcile(now, 1)).isZero();
        assertThat(service.reconcile(now.plusSeconds(1), 1)).isEqualTo(1);

        verify(messageDomainService).replyWhisper(
                4L, "WSP-2", "reply-2", "已回复", now.plusSeconds(1));
    }

    private AppMessageWhisper reservedWhisper(Long id, Long receiverUserId, String whisperNo,
                                               String requestId, Long replyMessageId) {
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setId(id);
        whisper.setReceiverUserId(receiverUserId);
        whisper.setWhisperNo(whisperNo);
        whisper.setReplyRequestId(requestId);
        whisper.setReplyMessageId(replyMessageId);
        return whisper;
    }
}

package com.spacetime.common.task;

import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("悄悄话到期状态迁移任务")
class MessageWhisperExpireTaskTest {

    @Test
    @DisplayName("任务只迁移已到期pending记录并返回处理数量")
    void shouldExpireDuePendingWhispers() {
        AppMessageWhisperDao whisperDao = mock(AppMessageWhisperDao.class);
        AppMessageRecordDao recordDao = mock(AppMessageRecordDao.class);
        MessageWhisperExpireTask task = new MessageWhisperExpireTask(whisperDao, recordDao);
        LocalDateTime now = LocalDateTime.of(2026, 8, 6, 12, 30);
        when(whisperDao.expireDue(now)).thenReturn(7);

        int affected = task.expireDueAt(now);

        assertThat(affected).isEqualTo(7);
        verify(whisperDao).expireDue(now);
        verify(recordDao).schedulePurgeForTerminalWhispers(now);
    }

    @Test
    @DisplayName("单次调度应连续追批直到本轮到期积压少于批量上限")
    void shouldDrainDueBacklogInBatches() {
        AppMessageWhisperDao whisperDao = mock(AppMessageWhisperDao.class);
        AppMessageRecordDao recordDao = mock(AppMessageRecordDao.class);
        MessageWhisperExpireTask task = new MessageWhisperExpireTask(whisperDao, recordDao);
        LocalDateTime now = LocalDateTime.of(2026, 8, 6, 12, 30);
        when(whisperDao.expireDue(now)).thenReturn(200, 200, 17);

        int affected = task.expireDueAt(now);

        assertThat(affected).isEqualTo(417);
        verify(whisperDao, times(3)).expireDue(now);
        verify(recordDao).schedulePurgeForTerminalWhispers(now);
    }
}

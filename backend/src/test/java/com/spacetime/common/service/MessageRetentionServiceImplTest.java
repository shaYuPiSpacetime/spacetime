package com.spacetime.common.service;

import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.service.impl.MessageRetentionServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("消息正文分类留存服务")
class MessageRetentionServiceImplTest {
    @Mock private AppMessageRecordDao recordDao;

    @Test
    @DisplayName("到期任务只应清空正文列并保留消息记录")
    void shouldClearExpiredContentWithoutDeletingMessageFacts() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 2, 30);
        when(recordDao.clearExpiredContent(now, 500)).thenReturn(12);

        int count = new MessageRetentionServiceImpl(recordDao).clearExpiredMessageContent(now, 500);

        assertThat(count).isEqualTo(12);
        verify(recordDao).clearExpiredContent(now, 500);
    }
}

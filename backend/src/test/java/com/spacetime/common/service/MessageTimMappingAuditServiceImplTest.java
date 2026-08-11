package com.spacetime.common.service;

import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.service.impl.MessageTimMappingAuditServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageTimMappingAuditServiceImplTest {
    @Mock private AppMessageDeliveryOutboxDao outboxDao;

    @Test
    void shouldReturnDetectedMismatchCountWithoutResending() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 15, 0);
        AppMessageDeliveryOutbox first = new AppMessageDeliveryOutbox();
        first.setId(1L);
        first.setEventKey("message:1");
        AppMessageDeliveryOutbox second = new AppMessageDeliveryOutbox();
        second.setId(2L);
        second.setEventKey("message:2");
        when(outboxDao.selectMappingInconsistencies(now.minusMinutes(10), 100))
                .thenReturn(List.of(first, second));

        int count = new MessageTimMappingAuditServiceImpl(outboxDao)
                .auditLocalMappings(now, 100);

        assertThat(count).isEqualTo(2);
    }
}

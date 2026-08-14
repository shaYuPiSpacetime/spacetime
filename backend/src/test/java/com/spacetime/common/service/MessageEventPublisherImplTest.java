package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppMessageEventInboxDao;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.impl.MessageEventPublisherImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("上游系统消息事件可靠入箱")
class MessageEventPublisherImplTest {
    @Mock private AppMessageEventInboxDao inboxDao;

    @Test
    @DisplayName("入箱只保存有界临时 JSON 和稳定幂等键")
    void publishShouldStoreBoundedTemporaryPayload() {
        MessageEventPublisherImpl service = new MessageEventPublisherImpl(
                inboxDao, new ObjectMapper());
        SystemMessageEvent event = new SystemMessageEvent(
                "prd05", "RPT-1-v2", 8L, "RPT-1", "report_result", "report_result",
                Map.of("result", "已处理"), LocalDateTime.of(2026, 9, 10, 0, 0));

        service.publishSystemMessage(event, LocalDateTime.of(2026, 8, 10, 12, 0));

        ArgumentCaptor<AppMessageEventInbox> captor = ArgumentCaptor.forClass(AppMessageEventInbox.class);
        verify(inboxDao).insert(captor.capture());
        AppMessageEventInbox stored = captor.getValue();
        assertThat(stored.getEventKey()).isEqualTo("prd05:system_message_create:RPT-1-v2:8");
        assertThat(stored.getPayloadJson())
                .contains("\"templateCode\":\"report_result\"")
                .contains("\"result\":\"已处理\"");
        assertThat(stored.getPayloadExpiresAt()).isEqualTo(LocalDateTime.of(2026, 8, 17, 12, 0));
    }
}

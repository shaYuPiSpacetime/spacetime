package com.spacetime.common.task;

import com.spacetime.common.dao.CommunityMessageOutboxDao;
import com.spacetime.common.entity.CommunityEventOutbox;
import com.spacetime.common.service.CommunityMessageOutboxService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CommunityMessageOutboxJobTest {

    @Test
    void shouldProcessClaimableCommunityEventsInBoundedBatch() {
        CommunityMessageOutboxDao dao = mock(CommunityMessageOutboxDao.class);
        CommunityMessageOutboxService service = mock(CommunityMessageOutboxService.class);
        CommunityEventOutbox event = new CommunityEventOutbox();
        event.setId(7L);
        when(dao.selectClaimable(any(), any(), eq(100))).thenReturn(List.of(event));

        new CommunityMessageOutboxJob(dao, service).deliver();

        verify(service).process(eq(7L), any());
    }
}

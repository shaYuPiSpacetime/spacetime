package com.spacetime.common.task;

import com.spacetime.common.service.MessageImAccountSyncService;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class MessageImAccountSyncJobTest {

    @Test
    void shouldRunBoundedSyncBatch() {
        MessageImAccountSyncService service = mock(MessageImAccountSyncService.class);

        new MessageImAccountSyncJob(service).sync();

        verify(service).syncPending(any(), org.mockito.ArgumentMatchers.eq(100));
    }
}

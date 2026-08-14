package com.spacetime.miniapp.service;

import com.spacetime.miniapp.service.impl.MiniappMessageServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

class MessageReadTransactionContractTest {

    @Test
    void readCompensationMustAdvanceWatermarkAndMessagesInOneTransaction() throws Exception {
        Transactional transactional = MiniappMessageServiceImpl.class
                .getMethod("readConversation", Long.class, String.class,
                        com.spacetime.miniapp.dto.request.MessageReadReq.class)
                .getAnnotation(Transactional.class);

        assertThat(transactional).isNotNull();
    }
}

package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.PromotionEventInboxDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.entity.PromotionEventInbox;
import com.spacetime.common.service.impl.PromotionEventProcessorImpl;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 推广事件永久无归因场景测试。
 */
class PromotionEventProcessorImplTest {

    @Test
    void 伪造或停用来源无归因时事件安全成功且不重试() {
        PromotionEventInboxDao inboxDao = mock(PromotionEventInboxDao.class);
        PromotionAttributionService attributionService = mock(PromotionAttributionService.class);
        PromotionEventInbox inbox = new PromotionEventInbox();
        inbox.setId(1L);
        inbox.setStatus("processing");
        inbox.setEventType("register_reward");
        inbox.setUserId(20L);
        inbox.setPayloadJson("{\"traceNos\":[\"fake-or-disabled\"]}");
        inbox.setCreateTime(LocalDateTime.now());
        when(inboxDao.selectById(1L)).thenReturn(inbox);
        when(attributionService.bindNewUser(any(), any(), any(), anyBoolean())).thenReturn(null);
        PromotionEventProcessorImpl processor = new PromotionEventProcessorImpl(
                inboxDao,
                mock(PromotionInviteRelationDao.class),
                attributionService,
                mock(PromotionRuleDomainService.class),
                mock(PromotionRewardDomainService.class),
                mock(PromotionAgentBonusService.class),
                new ObjectMapper());

        processor.processClaimed(1L);

        assertThat(inbox.getStatus()).isEqualTo("success");
        assertThat(inbox.getNextRetryTime()).isNull();
        verify(inboxDao).updateById(inbox);
    }
}

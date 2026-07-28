package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.PromotionEventInboxDao;
import com.spacetime.common.service.impl.PromotionEventInboxFailureServiceImpl;
import com.spacetime.common.service.impl.PromotionEventInboxServiceImpl;
import com.spacetime.common.service.impl.PromotionEventProcessorImpl;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 推广事件协调器事务边界与认领测试。
 */
class PromotionEventInboxServiceImplTest {

    @Test
    void 原子认领失败时不重复处理() {
        PromotionEventInboxDao inboxDao = mock(PromotionEventInboxDao.class);
        PromotionEventProcessor processor = mock(PromotionEventProcessor.class);
        PromotionEventInboxFailureService failureService = mock(PromotionEventInboxFailureService.class);
        PromotionEventInboxServiceImpl service = new PromotionEventInboxServiceImpl(
                inboxDao, mock(PromotionRuleDomainService.class), processor, failureService,
                mock(PromotionCoinGrantService.class), mock(PromotionRewardFailureService.class),
                new ObjectMapper());
        when(inboxDao.claim(any(), any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(0);

        service.process(1L);

        verify(processor, never()).processClaimed(any());
        verify(failureService, never()).markFailed(any(), any());
    }

    @Test
    void 领域事务异常时交由独立事务记录失败() {
        PromotionEventInboxDao inboxDao = mock(PromotionEventInboxDao.class);
        PromotionEventProcessor processor = mock(PromotionEventProcessor.class);
        PromotionEventInboxFailureService failureService = mock(PromotionEventInboxFailureService.class);
        PromotionEventInboxServiceImpl service = new PromotionEventInboxServiceImpl(
                inboxDao, mock(PromotionRuleDomainService.class), processor, failureService,
                mock(PromotionCoinGrantService.class), mock(PromotionRewardFailureService.class),
                new ObjectMapper());
        when(inboxDao.claim(any(), any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(1);
        RuntimeException failure = new RuntimeException("database unavailable");
        org.mockito.Mockito.doThrow(failure).when(processor).processClaimed(1L);

        service.process(1L);

        verify(failureService).markFailed(1L, failure);
    }

    @Test
    void 奖励发放失败只标记奖励失败且不回滚已成功事件() {
        PromotionEventInboxDao inboxDao = mock(PromotionEventInboxDao.class);
        PromotionEventProcessor processor = mock(PromotionEventProcessor.class);
        PromotionEventInboxFailureService inboxFailureService = mock(PromotionEventInboxFailureService.class);
        PromotionCoinGrantService coinGrantService = mock(PromotionCoinGrantService.class);
        PromotionRewardFailureService rewardFailureService = mock(PromotionRewardFailureService.class);
        PromotionEventInboxServiceImpl service = new PromotionEventInboxServiceImpl(
                inboxDao, mock(PromotionRuleDomainService.class), processor, inboxFailureService,
                coinGrantService, rewardFailureService, new ObjectMapper());
        when(inboxDao.claim(any(), any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(1);
        when(processor.processClaimed(1L)).thenReturn(List.of(99L));
        RuntimeException grantFailure = new RuntimeException("asset unavailable");
        org.mockito.Mockito.doThrow(grantFailure).when(coinGrantService).grant(99L);

        service.process(1L);

        verify(rewardFailureService).markFailed(
                org.mockito.ArgumentMatchers.eq(99L),
                org.mockito.ArgumentMatchers.eq("asset unavailable"),
                any(LocalDateTime.class));
        verify(inboxFailureService, never()).markFailed(any(), any());
    }

    @Test
    void 领域处理和失败记录使用不同事务边界() throws Exception {
        Transactional processorTx = PromotionEventProcessorImpl.class
                .getMethod("processClaimed", Long.class).getAnnotation(Transactional.class);
        Transactional failureTx = PromotionEventInboxFailureServiceImpl.class
                .getMethod("markFailed", Long.class, Throwable.class).getAnnotation(Transactional.class);

        assertThat(processorTx).isNotNull();
        assertThat(failureTx).isNotNull();
        assertThat(failureTx.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
    }
}

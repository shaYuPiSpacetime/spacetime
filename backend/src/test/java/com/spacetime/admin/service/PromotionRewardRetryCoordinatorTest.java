package com.spacetime.admin.service;

import com.spacetime.admin.service.impl.PromotionRewardRetryAdminService;
import com.spacetime.admin.service.impl.PromotionRewardRetryCoordinator;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * 后台人工重试奖励失败响应测试。
 */
class PromotionRewardRetryCoordinatorTest {

    @Test
    void 发放再次失败时先提交失败状态再向接口抛错() {
        PromotionRewardRetryAdminService transactionalService =
                mock(PromotionRewardRetryAdminService.class);
        PromotionRewardRetryCoordinator coordinator =
                new PromotionRewardRetryCoordinator(transactionalService);
        doThrow(new RuntimeException("asset unavailable"))
                .when(transactionalService).retry(9L, 3L);

        assertThatThrownBy(() -> coordinator.retryOrThrow(9L, 3L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("发放仍然失败");
        verify(transactionalService).recordFailedRetry(9L, 3L, "asset unavailable");
    }
}

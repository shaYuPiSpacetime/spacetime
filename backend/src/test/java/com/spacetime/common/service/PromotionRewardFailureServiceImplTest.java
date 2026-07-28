package com.spacetime.common.service;

import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.service.impl.PromotionRewardFailureServiceImpl;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 奖励失败退避持久化测试。
 */
class PromotionRewardFailureServiceImplTest {

    @Test
    void 首次失败和三次自动失败依次计划五分钟三十分钟两小时后停止() {
        PromotionRewardLogDao rewardDao = mock(PromotionRewardLogDao.class);
        PromotionRewardLog reward = new PromotionRewardLog();
        reward.setId(1L);
        reward.setStatus("pending");
        reward.setRetryCount(0);
        when(rewardDao.selectByIdForUpdate(1L)).thenReturn(reward);
        PromotionRewardFailureServiceImpl service = new PromotionRewardFailureServiceImpl(rewardDao);
        LocalDateTime now = LocalDateTime.of(2026, 7, 27, 10, 0);

        service.markFailed(1L, "第一次", now);
        assertThat(reward.getNextRetryTime()).isEqualTo(now.plusMinutes(5));
        service.markFailed(1L, "第二次", now.plusMinutes(5));
        assertThat(reward.getNextRetryTime()).isEqualTo(now.plusMinutes(35));
        service.markFailed(1L, "第三次", now.plusMinutes(35));
        assertThat(reward.getRetryCount()).isEqualTo(3);
        assertThat(reward.getNextRetryTime()).isEqualTo(now.plusMinutes(155));
        service.markFailed(1L, "第四次", now.plusMinutes(155));
        assertThat(reward.getRetryCount()).isEqualTo(4);
        assertThat(reward.getNextRetryTime()).isNull();
    }
}

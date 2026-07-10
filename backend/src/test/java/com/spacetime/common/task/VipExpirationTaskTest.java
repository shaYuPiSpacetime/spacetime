package com.spacetime.common.task;

import com.spacetime.common.dao.UserAssetDao;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("会员到期定时任务测试")
class VipExpirationTaskTest {

    @Mock
    private UserAssetDao userAssetDao;

    @InjectMocks
    private VipExpirationTask task;

    @Test
    @DisplayName("定时扫描会调用原子到期更新")
    void expireMemberships_shouldUpdateExpiredAssets() {
        when(userAssetDao.expireVipMemberships(any(LocalDateTime.class))).thenReturn(2);

        task.expireMemberships();

        verify(userAssetDao).expireVipMemberships(any(LocalDateTime.class));
    }
}

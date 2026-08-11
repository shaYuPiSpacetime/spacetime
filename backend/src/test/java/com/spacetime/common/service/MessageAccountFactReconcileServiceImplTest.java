package com.spacetime.common.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.service.impl.MessageAccountFactReconcileServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageAccountFactReconcileServiceImplTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 10, 12, 0);

    @Mock private AppUserDao appUserDao;
    @Mock private RelationLifecycleService relationLifecycleService;
    @Mock private AccountStatusMessageNotificationService notificationService;

    @Test
    void shouldReconcileRestrictedAccountRelationAndNotification() {
        AppUser user = new AppUser();
        user.setId(9L);
        user.setAccountStatus(AccountStatusEnum.FROZEN.getCode());
        user.setUpdateTime(NOW.minusMinutes(3));
        when(appUserDao.selectRestrictedWithoutMessage(NOW.minusHours(24), 200))
                .thenReturn(List.of(user));
        when(notificationService.publishNow(9L, AccountStatusEnum.FROZEN.getCode(),
                NOW.minusMinutes(3))).thenReturn(true);

        int count = new MessageAccountFactReconcileServiceImpl(
                appUserDao, relationLifecycleService, notificationService)
                .reconcileRecentAccountStatuses(NOW, 200);

        assertThat(count).isEqualTo(1);
        verify(relationLifecycleService).invalidateByUser(
                9L, RelationInvalidReasonEnum.ACCOUNT_FROZEN, NOW.minusMinutes(3));
        verify(notificationService).publishNow(
                9L, AccountStatusEnum.FROZEN.getCode(), NOW.minusMinutes(3));
    }
}

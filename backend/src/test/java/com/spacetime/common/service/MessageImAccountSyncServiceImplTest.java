package com.spacetime.common.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.provider.InstantMessageAccountProvider;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.common.service.impl.MessageImAccountSyncServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageImAccountSyncServiceImplTest {
    @Mock private AppUserImAccountDao accountDao;
    @Mock private AppUserDao userDao;
    @Mock private InstantMessageAccountProvider accountProvider;

    @Test
    void shouldClaimByVersionBeforeSyncingAccount() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 20, 0);
        AppUserImAccount account = account(10L, 7L, 3);
        AppUser user = normalUser(7L, "小满");
        when(accountDao.selectRetryCandidates(now.minusMinutes(1), 100))
                .thenReturn(List.of(account));
        when(accountDao.claimForSync(10L, 3, now)).thenReturn(1);
        when(userDao.selectById(7L)).thenReturn(user);

        int processed = service().syncPending(now, 100);

        assertThat(processed).isEqualTo(1);
        InOrder order = inOrder(accountDao, accountProvider);
        order.verify(accountDao).claimForSync(10L, 3, now);
        order.verify(accountProvider).syncAccount(7L, "小满", null);
    }

    @Test
    void shouldSkipCandidateLostInConcurrentClaim() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 20, 0);
        AppUserImAccount account = account(10L, 7L, 3);
        when(accountDao.selectRetryCandidates(now.minusMinutes(1), 100))
                .thenReturn(List.of(account));
        when(accountDao.claimForSync(10L, 3, now)).thenReturn(0);

        assertThat(service().syncPending(now, 100)).isZero();
        verify(userDao, never()).selectById(7L);
        verify(accountProvider, never()).syncAccount(7L, null, null);
    }

    @Test
    void shouldDisableOrphanAccountAndContinueAfterProviderFailure() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 10, 20, 0);
        AppUserImAccount orphan = account(10L, 7L, 3);
        AppUserImAccount retryable = account(11L, 8L, 5);
        when(accountDao.selectRetryCandidates(now.minusMinutes(1), 100))
                .thenReturn(List.of(orphan, retryable));
        when(accountDao.claimForSync(10L, 3, now)).thenReturn(1);
        when(accountDao.claimForSync(11L, 5, now)).thenReturn(1);
        when(userDao.selectById(7L)).thenReturn(null);
        when(userDao.selectById(8L)).thenReturn(normalUser(8L, "知夏"));
        when(accountDao.markDisabled(10L, 4, now)).thenReturn(1);
        org.mockito.Mockito.doThrow(new InstantMessageException(
                        "TIM_500", "provider unavailable", true))
                .when(accountProvider).syncAccount(8L, "知夏", null);

        assertThat(service().syncPending(now, 100)).isEqualTo(2);
        verify(accountDao).markDisabled(10L, 4, now);
        verify(accountProvider).syncAccount(8L, "知夏", null);
    }

    private MessageImAccountSyncServiceImpl service() {
        return new MessageImAccountSyncServiceImpl(accountDao, userDao, accountProvider);
    }

    private AppUserImAccount account(Long id, Long userId, int version) {
        AppUserImAccount account = new AppUserImAccount();
        account.setId(id);
        account.setUserId(userId);
        account.setSyncStatus("failed");
        account.setVersion(version);
        return account;
    }

    private AppUser normalUser(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        return user;
    }
}

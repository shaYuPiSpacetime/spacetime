package com.spacetime.common.service.impl;

import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** 赠送必须顺延会员且网络重试不能重复入账。 */
class UserAssetGrantServiceImplTest {
    private final AppUserDao users = mock(AppUserDao.class);
    private final UserAssetDao assets = mock(UserAssetDao.class);
    private final UserAssetGrantDao grants = mock(UserAssetGrantDao.class);
    private final UserCoinLogDao coins = mock(UserCoinLogDao.class);
    private final UserAssetGrantServiceImpl service = new UserAssetGrantServiceImpl(users, assets, grants, coins);

    @Test
    void extendsExistingMembershipWithoutChangingRechargeTotal() {
        AppUser user = new AppUser(); user.setId(1L);
        when(users.selectById(1L)).thenReturn(user);
        UserAsset asset = new UserAsset(); asset.setUserId(1L); asset.setCoinBalance(100);
        asset.setVipStatus("active"); asset.setVipExpireTime(LocalDateTime.of(2099, 1, 1, 0, 0));
        asset.setTotalRecharge(java.math.BigDecimal.TEN);
        when(assets.selectByUserIdForUpdate(1L)).thenReturn(asset);
        UserAssetGrant result = service.grant(1L, 30, 20, "admin:test", "admin_grant", "活动赠送", 2L, "运营");
        assertEquals(LocalDateTime.of(2099, 1, 31, 0, 0), result.getVipExpireAfter());
        assertEquals(120, result.getBalanceAfter());
        assertEquals(java.math.BigDecimal.TEN, asset.getTotalRecharge());
    }

    @Test
    void sameRequestReturnsOriginalReceiptWithoutAddingAssets() {
        when(users.selectById(1L)).thenReturn(new AppUser());
        UserAsset asset = new UserAsset(); asset.setCoinBalance(100);
        when(assets.selectByUserIdForUpdate(1L)).thenReturn(asset);
        UserAssetGrant previous = new UserAssetGrant();
        previous.setUserId(1L); previous.setVipDays(30); previous.setCoinAmount(20);
        previous.setReason("活动赠送"); previous.setOperatorId(2L);
        when(grants.findByKeyForUpdate("admin:test")).thenReturn(previous);
        assertSame(previous, service.grant(1L, 30, 20, "admin:test", "admin_grant", "活动赠送", 2L, "运营"));
        assertEquals(100, asset.getCoinBalance());
        verify(assets, never()).updateById(any());
        assertThrows(BusinessException.class, () -> service.grant(1L, 30, 99, "admin:test", "admin_grant", "活动赠送", 2L, "运营"));
    }

    @Test
    void refusesEmptyOrNegativeGrant() {
        assertThrows(BusinessException.class, () -> service.grant(1L, 0, 0, "admin:test", "admin_grant", "原因", 2L, "运营"));
        assertThrows(BusinessException.class, () -> service.grant(1L, 1, -1, "admin:test", "admin_grant", "原因", 2L, "运营"));
    }

    @Test
    void importedUserCanReceiveAssetsBeforeFirstLoginAndRetryDoesNotGrantTwice() {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setRegisterSource("ADMIN_IMPORT");
        when(users.selectById(1L)).thenReturn(user);
        AtomicReference<UserAsset> storedAsset = new AtomicReference<>();
        // 仅替代数据库读写，保留真实赠送服务的金额、会员及幂等计算。
        UserAssetDao importedAssets = mock(UserAssetDao.class, invocation -> {
            if ("initializeIfAbsent".equals(invocation.getMethod().getName()) && storedAsset.get() == null) {
                UserAsset empty = new UserAsset();
                empty.setId(10L);
                empty.setUserId(invocation.getArgument(0));
                empty.setCoinBalance(0);
                empty.setVipStatus("inactive");
                empty.setTodayFreeWhisperRemain(0);
                empty.setTotalRecharge(BigDecimal.ZERO);
                storedAsset.set(empty);
            }
            if ("selectByUserIdForUpdate".equals(invocation.getMethod().getName())) return storedAsset.get();
            return RETURNS_DEFAULTS.answer(invocation);
        });
        AtomicReference<UserAssetGrant> savedReceipt = new AtomicReference<>();
        when(grants.findByKeyForUpdate("admin:imported")).thenAnswer(invocation -> savedReceipt.get());
        doAnswer(invocation -> {
            savedReceipt.set(invocation.getArgument(0));
            return null;
        }).when(grants).insert(any());
        UserAssetGrantServiceImpl importedService = new UserAssetGrantServiceImpl(users, importedAssets, grants, coins);

        UserAssetGrant receipt = importedService.grant(1L, 30, 20, "admin:imported", "admin_grant", "导入用户奖励", 2L, "运营");
        LocalDateTime firstExpiry = storedAsset.get().getVipExpireTime();
        UserAssetGrant repeated = importedService.grant(1L, 30, 20, "admin:imported", "admin_grant", "导入用户奖励", 2L, "运营");

        assertSame(receipt, repeated);
        assertEquals(0, receipt.getBalanceBefore());
        assertEquals(20, receipt.getBalanceAfter());
        assertEquals(20, storedAsset.get().getCoinBalance());
        assertEquals("active", storedAsset.get().getVipStatus());
        assertEquals(firstExpiry, storedAsset.get().getVipExpireTime());
        assertEquals(BigDecimal.ZERO, storedAsset.get().getTotalRecharge());
        assertEquals(0, storedAsset.get().getTodayFreeWhisperRemain());
        verify(grants, times(1)).insert(receipt);
        verify(coins, times(1)).insert(argThat(log -> log.getChangeAmount() == 20 && log.getBalanceBefore() == 0 && log.getBalanceAfter() == 20));
    }

    @Test
    void missingUserCannotCreateAssetOrReceiveReward() {
        assertThrows(BusinessException.class, () -> service.grant(99L, 1, 10, "admin:missing", "admin_grant", "活动奖励", 2L, "运营"));
        verifyNoInteractions(assets, grants, coins);
    }
}

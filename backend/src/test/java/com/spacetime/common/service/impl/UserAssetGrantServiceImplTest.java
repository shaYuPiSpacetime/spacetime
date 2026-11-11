package com.spacetime.common.service.impl;

import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
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
}

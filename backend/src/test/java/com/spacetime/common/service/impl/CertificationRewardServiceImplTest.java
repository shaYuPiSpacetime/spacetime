package com.spacetime.common.service.impl;

import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.service.UserAssetGrantService;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

/** 认证奖励只发本人一次，关闭或未达标时不发放。 */
class CertificationRewardServiceImplTest {
    private final AppConfigDao configs = mock(AppConfigDao.class);
    private final AppUserDao users = mock(AppUserDao.class);
    private final AppUserAuditRecordDao audits = mock(AppUserAuditRecordDao.class);
    private final UserAssetDao assets = mock(UserAssetDao.class);
    private final UserAssetGrantDao grants = mock(UserAssetGrantDao.class);
    private final UserAssetGrantService granting = mock(UserAssetGrantService.class);
    private final CertificationRewardServiceImpl service = new CertificationRewardServiceImpl(configs, users, audits, assets, grants, granting);

    private void eligibleProfile() {
        AppConfig config = new AppConfig(); config.setStatus("ENABLED"); config.setConfigValue("100");
        when(configs.selectByKey("commercial.certification.reward.coins")).thenReturn(config);
        AppUser user = new AppUser(); user.setBasicProfileCompleted(1);
        when(users.selectOne(any())).thenReturn(user);
        when(assets.selectByUserIdForUpdate(7L)).thenReturn(new UserAsset());
    }

    @Test
    void disabledByDefaultDoesNotIssueAssets() {
        service.grantIfEligible(7L);
        verifyNoInteractions(granting);
    }

    @Test
    void missingCertificationDoesNotIssueAssets() {
        eligibleProfile();
        service.grantIfEligible(7L);
        verifyNoInteractions(granting);
    }

    @Test
    void allThreeApprovedIssuesConfiguredCoinsToTheUser() {
        eligibleProfile();
        AppUserAuditRecord approved = new AppUserAuditRecord(); approved.setStatus("APPROVED");
        when(audits.selectOne(any())).thenReturn(approved);
        service.grantIfEligible(7L);
        verify(granting).grant(7L, 0, 100, "certification:7", "certification_reward", "完成资料与认证奖励", null, "系统");
    }

    @Test
    void priorReceiptPreventsReissueAfterConfigurationChanges() {
        eligibleProfile();
        when(grants.findByKeyForUpdate("certification:7")).thenReturn(new UserAssetGrant());
        service.grantIfEligible(7L);
        verifyNoInteractions(granting);
    }
}

package com.spacetime.common.service.impl;

import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 关系准入投影必须复用完整核心准入口径。 */
@ExtendWith(MockitoExtension.class)
class RelationAccessProjectionServiceImplTest {

    @Mock private AppUserAuditService auditService;
    @Mock private Prd01RuntimeConfigResolver runtimeConfigResolver;

    private RelationAccessProjectionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new RelationAccessProjectionServiceImpl(
                auditService, new ProfileScoreConfig(), runtimeConfigResolver);
    }

    @Test
    void oneArgProjectionReusesPrd01EffectiveCertificationRule() {
        AppUser user = normalUser();
        when(auditService.certificationApprovedCount(1L)).thenReturn(3);

        assertThat(service.project(user)).isEqualTo("OPEN");
        verify(auditService).certificationApprovedCount(1L);
    }

    @Test
    void opensOnlyWhenProfileAgeAndCertificationsAllPass() {
        AppUser user = normalUser();
        assertThat(service.project(user, true, 18, 60)).isEqualTo("OPEN");

        user.setFirstLoginCompleted(0);
        assertThat(service.project(user, true, 18, 60)).isEqualTo("CLOSED");

        user.setFirstLoginCompleted(1);
        user.setAge(17);
        assertThat(service.project(user, true, 18, 60)).isEqualTo("CLOSED");

        user.setAge(28);
        assertThat(service.project(user, false, 18, 60)).isEqualTo("CLOSED");
    }

    @Test
    void projectsFrozenAccountAsAbnormal() {
        AppUser user = normalUser();
        user.setAccountStatus(AccountStatusEnum.FROZEN.getCode());

        assertThat(service.project(user, true, 18, 60)).isEqualTo("ABNORMAL");
    }

    private AppUser normalUser() {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(1);
        user.setAge(28);
        return user;
    }
}

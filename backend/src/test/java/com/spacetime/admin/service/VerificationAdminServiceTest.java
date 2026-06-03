package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.service.impl.VerificationAdminServiceImpl;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.VerificationStatusEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("VerificationAdminService L3 测试")
class VerificationAdminServiceTest {

    @Mock
    private AppUserVerificationDao verificationDao;
    @Mock
    private AppUserDao appUserDao;

    @InjectMocks
    private VerificationAdminServiceImpl verificationAdminService;

    private AppUserVerification verification;

    @BeforeEach
    void setUp() {
        verification = new AppUserVerification();
        verification.setId(1L);
        verification.setUserId(1L);
        verification.setRealNameStatus(VerificationStatusEnum.PENDING.getCode());
        verification.setEducationStatus(VerificationStatusEnum.PENDING.getCode());
        verification.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setVerifyLevel(1);
    }

    @Test
    @DisplayName("L3-21 后台审核 — 实名认证通过")
    void shouldApproveRealNameVerification() {
        when(verificationDao.selectById(1L)).thenReturn(verification);

        ModerationAuditReq req = new ModerationAuditReq();
        req.setAction("APPROVE");

        verificationAdminService.auditRealName(1L, req);
        assertThat(verification.getRealNameStatus()).isEqualTo(VerificationStatusEnum.APPROVED.getCode());
        assertThat(verification.getVerifyLevel()).isEqualTo(2);
    }

    @Test
    @DisplayName("L3-22 后台审核 — 驳回带原因")
    void shouldRejectWithReason() {
        when(verificationDao.selectById(1L)).thenReturn(verification);

        ModerationAuditReq req = new ModerationAuditReq();
        req.setAction("REJECT");
        req.setRejectReason("资料不完整");

        verificationAdminService.auditEducation(1L, req);
        assertThat(verification.getEducationStatus()).isEqualTo(VerificationStatusEnum.REJECTED.getCode());
        assertThat(verification.getEducationRejectReason()).isEqualTo("资料不完整");
    }
}

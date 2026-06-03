package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.service.impl.ModerationAdminServiceImpl;
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
@DisplayName("ModerationAdminService L3 测试")
class ModerationAdminServiceTest {

    @Mock
    private AppUserVerificationDao verificationDao;
    @Mock
    private AppUserDao appUserDao;

    @InjectMocks
    private ModerationAdminServiceImpl moderationAdminService;

    private AppUserVerification verification;

    @BeforeEach
    void setUp() {
        verification = new AppUserVerification();
        verification.setId(1L);
        verification.setUserId(1L);
        verification.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setProfilePhotoAuditStatus("PENDING");
        verification.setOpenTextAuditStatus("PENDING");
    }

    @Test
    @DisplayName("L3-23 照片审核不影响头像认证")
    void shouldNotAffectAvatarVerifyWhenRejectingPhoto() {
        when(verificationDao.selectById(1L)).thenReturn(verification);

        ModerationAuditReq req = new ModerationAuditReq();
        req.setAction("REJECT");
        req.setRejectReason("照片不符合规范");

        moderationAdminService.auditPhoto(1L, req);
        assertThat(verification.getProfilePhotoAuditStatus()).isEqualTo("REJECTED");
        assertThat(verification.getAvatarVerifyStatus()).isEqualTo(VerificationStatusEnum.APPROVED.getCode());
    }
}

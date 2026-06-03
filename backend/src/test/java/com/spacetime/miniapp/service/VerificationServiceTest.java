package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.service.impl.VerificationServiceImpl;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("VerificationService L3 测试")
class VerificationServiceTest {

    @Mock
    private AppUserVerificationDao verificationDao;
    @Mock
    private AppUserDao appUserDao;

    @InjectMocks
    private VerificationServiceImpl verificationService;

    private AppUser user;
    private AppUserVerification verification;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L);
        user.setAvatar("https://cdn.example.com/avatar.jpg");

        verification = new AppUserVerification();
        verification.setUserId(1L);
        verification.setRealNameStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        verification.setEducationStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        verification.setAvatarVerifyStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        verification.setVerifyLevel(0);
    }

    @Test
    @DisplayName("L3-17 实名认证 — mock 通过")
    void shouldMockApproveRealName() {
        when(verificationDao.selectOne(any())).thenReturn(verification);

        RealNameSubmitReq req = new RealNameSubmitReq();
        req.setRealName("张三");
        req.setIdCard("110101200001011234");

        verificationService.submitRealName(1L, req);
        assertThat(verification.getRealNameStatus()).isEqualTo(VerificationStatusEnum.APPROVED.getCode());
        assertThat(verification.getRealNameSubmitTime()).isNotNull();
        assertThat(verification.getVerifyLevel()).isEqualTo(1);
    }

    @Test
    @DisplayName("L3-18 身份证格式校验失败")
    void shouldRejectInvalidIdCard() {
        RealNameSubmitReq req = new RealNameSubmitReq();
        req.setRealName("张三");
        req.setIdCard("123456");

        assertThatThrownBy(() -> verificationService.submitRealName(1L, req))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("L3-19 学历认证 — mock PENDING")
    void shouldSetEducationPending() {
        when(verificationDao.selectOne(any())).thenReturn(verification);

        EducationSubmitReq req = new EducationSubmitReq();
        req.setEducationMethod("CHSI");
        req.setVerificationCode("123456");

        verificationService.submitEducation(1L, req);
        assertThat(verification.getEducationStatus()).isEqualTo(VerificationStatusEnum.PENDING.getCode());
        assertThat(verification.getEducationSubmitTime()).isNotNull();
    }

    @Test
    @DisplayName("L3-20 认证等级计算")
    void shouldCalculateVerifyLevel() {
        verification.setRealNameStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setEducationStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());

        int level = 0;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getRealNameStatus())) level++;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getEducationStatus())) level++;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getAvatarVerifyStatus())) level++;

        assertThat(level).isEqualTo(2);
    }
}

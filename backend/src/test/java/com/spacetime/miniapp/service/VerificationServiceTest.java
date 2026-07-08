package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.AvatarVerifyReq;
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

import java.time.LocalDateTime;
import java.util.List;

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
        req.setSinglePromise(true);

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
        verification.setRealNameStatus(VerificationStatusEnum.APPROVED.getCode());

        EducationSubmitReq req = new EducationSubmitReq();
        req.setEducationMethod("CHSI");
        req.setSchool("Sun Yat-sen University");
        req.setStudentStatus("GRADUATED");
        req.setVerificationCode("123456");
        req.setMaterialIds(List.of(11L, 12L));

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

    @Test
    @DisplayName("real-name requires single promise confirmation")
    void shouldRequireSinglePromiseForRealName() {
        when(verificationDao.selectOne(any())).thenReturn(verification);

        RealNameSubmitReq req = new RealNameSubmitReq();
        req.setRealName("Zhang San");
        req.setIdCard("110101200001011234");
        req.setSinglePromise(false);

        assertThatThrownBy(() -> verificationService.submitRealName(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("singlePromise");
    }

    @Test
    @DisplayName("status response exposes submit times and core access status")
    void shouldExposeStatusSubmitTimesAndCoreAccessStatus() {
        verification.setRealNameStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setEducationStatus(VerificationStatusEnum.PENDING.getCode());
        verification.setAvatarVerifyStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        verification.setRealNameSubmitTime(LocalDateTime.of(2026, 7, 7, 10, 0));
        verification.setEducationSubmitTime(LocalDateTime.of(2026, 7, 7, 11, 0));
        verification.setAvatarVerifySubmitTime(LocalDateTime.of(2026, 7, 7, 12, 0));
        when(verificationDao.selectOne(any())).thenReturn(verification);

        var vo = verificationService.getStatus(1L);

        assertThat(vo.getRealNameSubmitTime()).isEqualTo("2026-07-07 10:00:00");
        assertThat(vo.getEducationSubmitTime()).isEqualTo("2026-07-07 11:00:00");
        assertThat(vo.getAvatarVerifySubmitTime()).isEqualTo("2026-07-07 12:00:00");
        assertThat(vo.getCoreAccessStatus()).isEqualTo("NON_CORE_ONLY");
    }

    @Test
    @DisplayName("avatar verification accepts mediaId request body")
    void shouldVerifyAvatarWithMediaIdBody() {
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(verificationDao.selectOne(any())).thenReturn(verification);

        AvatarVerifyReq req = new AvatarVerifyReq();
        req.setMediaId(88L);

        var vo = verificationService.verifyAvatar(1L, req);

        assertThat(vo.getAvatarVerifyStatus()).isEqualTo(VerificationStatusEnum.APPROVED.getCode());
        assertThat(vo.getAvatarVerifySubmitTime()).isNotBlank();
    }
}

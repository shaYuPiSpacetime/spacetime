package com.spacetime.miniapp.service;

import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.GenderEnum;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.ProfileInitSaveReq;
import com.spacetime.miniapp.dto.request.ProfileUpdateReq;
import com.spacetime.miniapp.service.impl.ProfileServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ProfileService L3 测试")
class ProfileServiceTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserVerificationDao verificationDao;

    @Spy
    private ProfileScoreConfig profileScoreConfig = new ProfileScoreConfig();
    @InjectMocks
    private ProfileServiceImpl profileService;

    private AppUser user;
    private AppUserVerification verification;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L);
        user.setOpenid("test_openid");
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(0);

        verification = new AppUserVerification();
        verification.setUserId(1L);
        verification.setRealNameStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        verification.setEducationStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        verification.setAvatarVerifyStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
    }

    @Test
    @DisplayName("L3-01 资料完整度 — 全满100分")
    void shouldCalculateFullScore() {
        AppUser full = new AppUser();
        full.setNickname("测试用户");
        full.setAvatar("https://cdn.example.com/avatar.jpg");
        full.setGender(GenderEnum.MALE.getCode());
        full.setBirthday(LocalDate.of(2000, 1, 15));
        full.setHeight(175);
        full.setLocationCity("广州");
        full.setHometownCity("长沙");
        full.setDatingGoal("SERIOUS_RELATIONSHIP");
        full.setEmotionalStatus("LOOKING");
        full.setMaritalStatus("UNMARRIED");
        full.setSchool("中山大学");
        full.setEducationLevel("BACHELOR");
        full.setAboutMe("我是一个热爱生活的人，平时喜欢旅游和摄影");
        full.setHopeTheyKnow("希望对方真诚善良");

        int score = profileScoreConfig.calculate(full);
        assertThat(score).isEqualTo(85);
    }

    @Test
    @DisplayName("L3-02 资料完整度 — 空用户0分")
    void shouldCalculateZeroScore() {
        AppUser empty = new AppUser();
        int score = profileScoreConfig.calculate(empty);
        assertThat(score).isEqualTo(0);
    }

    @Test
    @DisplayName("L3-03 资料完整度 — 部分填充30分")
    void shouldCalculatePartialScore() {
        AppUser partial = new AppUser();
        partial.setNickname("测试");
        partial.setAvatar("https://cdn.example.com/avatar.jpg");
        partial.setGender(GenderEnum.MALE.getCode());
        partial.setSchool("中山大学");
        // 5 + 10 + 5 + 10 = 30

        int score = profileScoreConfig.calculate(partial);
        assertThat(score).isEqualTo(30);
    }

    @Test
    @DisplayName("L3-04 准入判定 — 未完成首登全部禁止")
    void shouldBlockAccessWhenFirstLoginNotCompleted() {
        user.setFirstLoginCompleted(0);
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(verificationDao.selectOne(any())).thenReturn(verification);

        var vo = profileService.getAccessStatus(1L);
        assertThat(vo.getCanBrowseCards()).isFalse();
        assertThat(vo.getCanMatch()).isFalse();
        assertThat(vo.getCanBeExposed()).isFalse();
        assertThat(vo.getBlockReason()).isNotEmpty();
    }

    @Test
    @DisplayName("L3-05 准入判定 — 完成首登未实名只能浏览")
    void shouldAllowBrowseOnlyWhenNotRealNameVerified() {
        user.setFirstLoginCompleted(1);
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(verificationDao.selectOne(any())).thenReturn(verification);

        var vo = profileService.getAccessStatus(1L);
        assertThat(vo.getCanBrowseCards()).isTrue();
        assertThat(vo.getCanMatch()).isFalse();
        assertThat(vo.getCanBeExposed()).isFalse();
    }

    @Test
    @DisplayName("L3-06 准入判定 — 实名通过全能力可用")
    void shouldAllowFullAccessWhenRealNameVerified() {
        user.setFirstLoginCompleted(1);
        verification.setRealNameStatus(VerificationStatusEnum.APPROVED.getCode());
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(verificationDao.selectOne(any())).thenReturn(verification);

        var vo = profileService.getAccessStatus(1L);
        assertThat(vo.getCanBrowseCards()).isTrue();
        assertThat(vo.getCanMatch()).isTrue();
        assertThat(vo.getCanBeExposed()).isTrue();
    }

    @Test
    @DisplayName("L3-07 准入判定 — 账号冻结全部禁止")
    void shouldBlockAllWhenAccountFrozen() {
        user.setFirstLoginCompleted(1);
        user.setAccountStatus(AccountStatusEnum.FROZEN.getCode());
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(verificationDao.selectOne(any())).thenReturn(verification);

        var vo = profileService.getAccessStatus(1L);
        assertThat(vo.getCanBrowseCards()).isFalse();
        assertThat(vo.getCanMatch()).isFalse();
        assertThat(vo.getCanBeExposed()).isFalse();
        assertThat(vo.getBlockReason()).contains("异常");
    }

    @Test
    @DisplayName("L3-14 首登资料 — 性别不可修改")
    void shouldRejectGenderChange() {
        user.setGender(GenderEnum.MALE.getCode());
        when(appUserDao.selectById(1L)).thenReturn(user);

        ProfileInitSaveReq req = new ProfileInitSaveReq();
        req.setStep(1);
        req.setGender(GenderEnum.FEMALE.getCode());
        req.setNickname("测试用户");

        assertThatThrownBy(() -> profileService.saveInit(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("性别");
    }

    @Test
    @DisplayName("L3-15 资料编辑 — 修改头像重置认证")
    void shouldResetAvatarVerifyOnAvatarChange() {
        user.setAvatar("https://cdn.example.com/old-avatar.jpg");
        verification.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(verificationDao.selectOne(any())).thenReturn(verification);

        ProfileUpdateReq req = new ProfileUpdateReq();
        req.setAvatar("https://cdn.example.com/new-avatar.jpg");

        profileService.updateProfile(1L, req);
        assertThat(verification.getAvatarVerifyStatus()).isEqualTo(VerificationStatusEnum.PENDING.getCode());
    }

    @Test
    @DisplayName("L3-16 资料编辑 — 修改aboutMe重置文字审核")
    void shouldResetTextAuditOnAboutMeChange() {
        user.setAboutMe("旧的关于我");
        verification.setOpenTextAuditStatus("APPROVED");
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(verificationDao.selectOne(any())).thenReturn(verification);

        ProfileUpdateReq req = new ProfileUpdateReq();
        req.setAboutMe("这是一个新的关于我的介绍文字，用来测试修改后重置审核状态");

        profileService.updateProfile(1L, req);
        assertThat(verification.getOpenTextAuditStatus()).isEqualTo("PENDING");
    }
}

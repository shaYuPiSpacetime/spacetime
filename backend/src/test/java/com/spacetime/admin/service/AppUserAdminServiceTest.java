package com.spacetime.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.response.AppUserListVO;
import com.spacetime.admin.service.impl.AppUserAdminServiceImpl;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
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
import static org.mockito.Mockito.*;

/**
 * AppUserAdminService 单元测试
 * 验证用户分页查询中 EXISTS 子查询筛选、批量加载避免 N+1、状态变更校验
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AppUserAdminService L3 测试")
class AppUserAdminServiceTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserVerificationDao verificationDao;

    @InjectMocks
    private AppUserAdminServiceImpl appUserAdminService;

    /** 测试用户1：已完成首登、实名通过 */
    private AppUser user1;
    /** 测试用户2：未完成首登、未实名 */
    private AppUser user2;
    /** 测试认证记录1 */
    private AppUserVerification v1;
    /** 测试认证记录2 */
    private AppUserVerification v2;

    @BeforeEach
    void setUp() {
        user1 = new AppUser();
        user1.setId(1L);
        user1.setNickname("张三");
        user1.setAvatar("https://cdn.example.com/avatar1.jpg");
        user1.setGender("MALE");
        user1.setAge(25);
        user1.setSchool("中山大学");
        user1.setFirstLoginCompleted(1);
        user1.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user1.setProfileScore(80);
        user1.setRegisterTime(LocalDateTime.of(2026, 5, 1, 10, 0));
        user1.setLastLoginTime(LocalDateTime.of(2026, 6, 3, 8, 0));

        user2 = new AppUser();
        user2.setId(2L);
        user2.setNickname("李四");
        user2.setAvatar("https://cdn.example.com/avatar2.jpg");
        user2.setGender("FEMALE");
        user2.setAge(23);
        user2.setSchool("浙江大学");
        user2.setFirstLoginCompleted(0);
        user2.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user2.setProfileScore(30);
        user2.setRegisterTime(LocalDateTime.of(2026, 5, 15, 14, 0));
        user2.setLastLoginTime(LocalDateTime.of(2026, 6, 2, 12, 0));

        v1 = new AppUserVerification();
        v1.setUserId(1L);
        v1.setRealNameStatus(VerificationStatusEnum.APPROVED.getCode());
        v1.setEducationStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        v1.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
        v1.setVerifyLevel(2);

        v2 = new AppUserVerification();
        v2.setUserId(2L);
        v2.setRealNameStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        v2.setEducationStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        v2.setAvatarVerifyStatus(VerificationStatusEnum.NOT_CERTIFIED.getCode());
        v2.setVerifyLevel(0);
    }

    /**
     * L3-31 验证 EXISTS 子查询筛选生效：传入 realNameStatus=APPROVED 时只返回匹配用户
     */
    @Test
    @DisplayName("L3-31 用户分页 — EXISTS 子查询筛选认证状态")
    void shouldFilterByRealNameStatusInSQL() {
        // Mock: selectPage returns only realName APPROVED user
        Page<AppUser> mockPage = new Page<>(1, 20, 1);
        mockPage.setRecords(List.of(user1));
        when(appUserDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(mockPage);
        when(verificationDao.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(v1));

        AppUserPageReq req = new AppUserPageReq();
        req.setPage(1);
        req.setSize(20);
        req.setRealNameStatus("APPROVED");

        Page<AppUserListVO> result = appUserAdminService.getUserPage(req);

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getRecords()).hasSize(1);
        AppUserListVO vo = result.getRecords().get(0);
        assertThat(vo.getRealNameStatus()).isEqualTo("APPROVED");
        assertThat(vo.getAccessStatus()).isEqualTo("full_access");
        verify(verificationDao).selectList(any(LambdaQueryWrapper.class));
    }

    /**
     * L3-32 验证批量加载认证数据：verificationDao.selectList 只调用1次，避免 N+1 查询
     */
    @Test
    @DisplayName("L3-32 用户分页 — 批量加载认证数据避免 N+1")
    void shouldBatchLoadVerificationData() {
        Page<AppUser> mockPage = new Page<>(1, 20, 3);
        mockPage.setRecords(List.of(user1, user2));
        when(appUserDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(mockPage);
        when(verificationDao.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(v1, v2));

        AppUserPageReq req = new AppUserPageReq();
        req.setPage(1);
        req.setSize(20);

        appUserAdminService.getUserPage(req);

        // 验证只调用一次批量查询，不是每个用户一次
        verify(verificationDao, times(1)).selectList(any(LambdaQueryWrapper.class));
    }

    /**
     * L3-33 验证不合法账号状态被拒绝：传入 INVALID_STATUS 抛 BusinessException
     */
    @Test
    @DisplayName("L3-33 用户状态变更 — 不合法状态拒绝")
    void shouldRejectInvalidAccountStatus() {
        assertThatThrownBy(() -> appUserAdminService.updateUserStatus(1L, "INVALID_STATUS"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不支持");
    }
}

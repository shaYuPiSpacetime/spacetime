package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.response.ModerationDetailVO;
import com.spacetime.admin.service.impl.ModerationAdminServiceImpl;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
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

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * ModerationAdminService 单元测试
 * 验证照片/文字审核详情查询与审核操作的隔离性
 */
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
    private AppUser user;

    @BeforeEach
    void setUp() {
        verification = new AppUserVerification();
        verification.setId(1L);
        verification.setUserId(1L);
        verification.setAvatarVerifyStatus(VerificationStatusEnum.APPROVED.getCode());
        verification.setProfilePhotoAuditStatus("PENDING");
        verification.setOpenTextAuditStatus("PENDING");

        user = new AppUser();
        user.setId(1L);
        user.setNickname("测试用户");
        user.setAvatar("https://cdn.example.com/avatar.jpg");
    }

    // ==================== L3-23: 原有审计测试 ====================

    /**
     * L3-23 验证照片驳回不影响头像认证状态：avatarVerifyStatus 保持 APPROVED
     */
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

    // ==================== L3-29~30: 审核详情查询 ====================

    /**
     * L3-29 验证照片审核详情：contentType="照片"，contentFull 为照片URL（JSON数组），submitTime 非空
     */
    @Test
    @DisplayName("L3-29 后台审核详情 — 查询照片审核详情")
    void shouldReturnPhotoModerationDetail() {
        user.setPhotos("[\"https://cdn.example.com/photo1.jpg\",\"https://cdn.example.com/photo2.jpg\"]");
        verification.setProfilePhotoSubmitTime(LocalDateTime.of(2026, 6, 2, 16, 45));
        when(verificationDao.selectById(1L)).thenReturn(verification);
        when(appUserDao.selectById(1L)).thenReturn(user);

        ModerationDetailVO vo = moderationAdminService.getPhotoDetail(1L);

        assertThat(vo.getId()).isEqualTo(1L);
        assertThat(vo.getUserId()).isEqualTo(1L);
        assertThat(vo.getNickname()).isEqualTo("测试用户");
        assertThat(vo.getContentType()).isEqualTo("照片");
        assertThat(vo.getContentFull()).isEqualTo("[\"https://cdn.example.com/photo1.jpg\",\"https://cdn.example.com/photo2.jpg\"]");
        assertThat(vo.getStatus()).isEqualTo("PENDING");
        assertThat(vo.getSubmitTime()).isEqualTo("2026-06-02 16:45:00");
    }

    /**
     * L3-30 验证文字审核详情：contentType="文字"，contentFull 为完整文本不截断，contentField 非空
     */
    @Test
    @DisplayName("L3-30 后台审核详情 — 查询文字审核详情")
    void shouldReturnTextModerationDetail() {
        user.setAboutMe("我是一个热爱生活的人，平时喜欢旅游和摄影，希望能遇到志同道合的人");
        verification.setOpenTextSubmitTime(LocalDateTime.of(2026, 6, 2, 15, 0));
        when(verificationDao.selectById(1L)).thenReturn(verification);
        when(appUserDao.selectById(1L)).thenReturn(user);

        ModerationDetailVO vo = moderationAdminService.getTextDetail(1L);

        assertThat(vo.getId()).isEqualTo(1L);
        assertThat(vo.getContentType()).isEqualTo("文字");
        assertThat(vo.getContentField()).isEqualTo("关于我");
        assertThat(vo.getContentFull()).isEqualTo("我是一个热爱生活的人，平时喜欢旅游和摄影，希望能遇到志同道合的人");
        assertThat(vo.getStatus()).isEqualTo("PENDING");
        assertThat(vo.getSubmitTime()).isEqualTo("2026-06-02 15:00:00");
    }
}

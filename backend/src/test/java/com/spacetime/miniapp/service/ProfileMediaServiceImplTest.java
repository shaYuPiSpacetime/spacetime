package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ImageSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.miniapp.dto.request.AvatarSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.response.AvatarSubmitVO;
import com.spacetime.miniapp.service.impl.ProfileMediaServiceImpl;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 移动端头像提交服务测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("移动端头像提交服务")
class ProfileMediaServiceImplTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserAuditRecordDao auditRecordDao;
    @Mock
    private AppUserAuditService auditService;
    @Mock
    private ExternalProviderTaskDao externalProviderTaskDao;
    @Mock
    private ImageSafetyProvider imageSafetyProvider;
    @Mock
    private Prd01RuntimeConfigResolver runtimeConfigResolver;
    @Mock
    private ProfileDictionaryService profileDictionaryService;

    @InjectMocks
    private ProfileMediaServiceImpl profileMediaService;

    private Prd01RuntimeConfigResolver.RuntimeConfigSnapshot configSnapshot;

    @BeforeEach
    void setUpRuntimeConfig() {
        configSnapshot = new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(java.util.Map.of());
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.snapshot()).thenReturn(configSnapshot);
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.copyText(
                        configSnapshot, "safety_image_failed", "图片安全审核未通过"))
                .thenReturn("图片安全审核未通过");
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.uploadRule(configSnapshot, "album", 9, 10))
                .thenReturn(new Prd01RuntimeConfigResolver.UploadRule(9, 10, List.of("jpg", "jpeg", "png")));
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.uploadRule(configSnapshot, "profileBg", 1, 10))
                .thenReturn(new Prd01RuntimeConfigResolver.UploadRule(1, 10, List.of("jpg", "jpeg", "png")));
        org.mockito.Mockito.lenient().when(auditRecordDao.count(any())).thenReturn(0L);
        org.mockito.Mockito.lenient().when(profileDictionaryService.requireCode(
                        org.mockito.ArgumentMatchers.eq("app_avatar_source"),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.eq("头像来源")))
                .thenAnswer(invocation -> invocation.getArgument(1));
    }

    @Test
    @DisplayName("提交裁剪头像后更新当前头像并生成待审核记录")
    void shouldSubmitAvatarAndCreatePendingAuditRecord() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR)).thenReturn(null);
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(101L);
            return record;
        });
        when(imageSafetyProvider.check(
                "AVATAR",
                "https://static.example.com/avatar/cropped.jpg",
                "https://static.example.com/avatar/cropped-thumb.jpg"))
                .thenReturn(ProviderCheckResult.safe(
                        "mock-image-safety", "{\"mocked\":true,\"result\":\"safe\"}", true));
        org.mockito.Mockito.doAnswer(invocation -> {
            ExternalProviderTask task = invocation.getArgument(0);
            task.setId(301L);
            return null;
        }).when(externalProviderTaskDao).insert(any());

        AvatarSubmitReq req = new AvatarSubmitReq();
        req.setAvatarSource("ALBUM");
        req.setAvatarUrl("https://static.example.com/avatar/cropped.jpg");
        req.setThumbUrl("https://static.example.com/avatar/cropped-thumb.jpg");

        AvatarSubmitVO result = profileMediaService.submitAvatar(7L, req);

        ArgumentCaptor<AppUserAuditRecord> recordCaptor = ArgumentCaptor.forClass(AppUserAuditRecord.class);
        verify(auditService).submit(recordCaptor.capture());
        AppUserAuditRecord record = recordCaptor.getValue();
        assertThat(record.getAuditType()).isEqualTo(AppUserAuditTypeEnum.AVATAR.getCode());
        assertThat(record.getStatus()).isEqualTo(AppUserAuditStatusEnum.PENDING.getCode());
        assertThat(record.getMediaUrl()).isEqualTo(req.getAvatarUrl());
        assertThat(record.getThumbUrl()).isEqualTo(req.getThumbUrl());
        assertThat(record.getMaterialJson()).contains("\"avatarSource\":\"ALBUM\"");
        verify(appUserDao, never()).updateById(any());
        verify(imageSafetyProvider).check(
                "AVATAR", req.getAvatarUrl(), req.getThumbUrl());
        verify(auditService).machineApprove(
                101L, 301L, "{\"mocked\":true,\"result\":\"safe\"}");

        assertThat(result.getAuditRecordId()).isEqualTo(101L);
        assertThat(result.getAuditStatus()).isEqualTo(AppUserAuditStatusEnum.PENDING.getCode());
        assertThat(result.getAuditSource()).isEqualTo("MACHINE");
    }

    @Test
    @DisplayName("相册和背景图提交后都执行图片安全机审")
    void shouldReviewAlbumAndProfileBackgroundByImageProvider() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(AppUserAuditTypeEnum.ALBUM_PHOTO.getCode().equals(record.getAuditType()) ? 201L : 202L);
            return record;
        });
        when(imageSafetyProvider.check(any(), any(), any()))
                .thenReturn(ProviderCheckResult.safe(
                        "mock-image-safety", "{\"mocked\":true,\"result\":\"safe\"}", true));
        org.mockito.Mockito.doAnswer(invocation -> {
            ExternalProviderTask task = invocation.getArgument(0);
            task.setId(401L);
            return null;
        }).when(externalProviderTaskDao).insert(any());

        ProfileMediaSubmitReq album = mediaReq("ALBUM", "https://static.example.com/album.jpg");
        ProfileMediaSubmitReq background = mediaReq("PROFILE_BG", "https://static.example.com/bg.jpg");

        profileMediaService.submitMedia(7L, album);
        profileMediaService.submitMedia(7L, background);

        verify(imageSafetyProvider).check(
                "ALBUM_PHOTO", album.getMediaUrl(), album.getThumbUrl());
        verify(imageSafetyProvider).check(
                "PROFILE_BG", background.getMediaUrl(), background.getThumbUrl());
        verify(auditService).machineApprove(
                201L, 401L, "{\"mocked\":true,\"result\":\"safe\"}");
        verify(auditService).machineApprove(
                202L, 401L, "{\"mocked\":true,\"result\":\"safe\"}");
    }

    @Test
    @DisplayName("背景图独立提交时固定生成资料背景图审核记录")
    void shouldSubmitProfileBackgroundWithDedicatedAuditType() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(202L);
            return record;
        });
        when(imageSafetyProvider.check(any(), any(), any()))
                .thenReturn(ProviderCheckResult.safe(
                        "mock-image-safety", "{\"mocked\":true,\"result\":\"safe\"}", true));
        org.mockito.Mockito.doAnswer(invocation -> {
            ExternalProviderTask task = invocation.getArgument(0);
            task.setId(402L);
            return null;
        }).when(externalProviderTaskDao).insert(any());

        ProfileMediaSubmitReq background = mediaReq(null, "https://static.example.com/bg.jpg");

        profileMediaService.submitProfileBackground(7L, background);

        ArgumentCaptor<AppUserAuditRecord> recordCaptor = ArgumentCaptor.forClass(AppUserAuditRecord.class);
        verify(auditService).submit(recordCaptor.capture());
        assertThat(recordCaptor.getValue().getAuditType()).isEqualTo(AppUserAuditTypeEnum.PROFILE_BG.getCode());
        verify(imageSafetyProvider).check(
                "PROFILE_BG", background.getMediaUrl(), background.getThumbUrl());
    }

    @Test
    @DisplayName("相册达到后台配置张数上限时拒绝新增")
    void shouldRejectAlbumWhenUploadCountReached() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(auditRecordDao.count(any())).thenReturn(9L);

        ProfileMediaSubmitReq album = mediaReq("ALBUM", "https://static.example.com/album-limit.jpg");

        assertThatThrownBy(() -> profileMediaService.submitMedia(7L, album))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("上传数量不能超过 9 张");
        verify(auditService, never()).submit(any());
        verify(imageSafetyProvider, never()).check(any(), any(), any());
    }

    @Test
    @DisplayName("删除背景图时将当前生效记录置为失效")
    void shouldExpireEffectiveProfileBackgroundWhenDeleted() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        AppUserAuditRecord effective = new AppUserAuditRecord();
        effective.setId(88L);
        effective.setAuditType(AppUserAuditTypeEnum.PROFILE_BG.getCode());
        effective.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        when(auditService.latestEffectiveRecord(7L, AppUserAuditTypeEnum.PROFILE_BG)).thenReturn(effective);

        profileMediaService.deleteProfileBackground(7L);

        verify(auditService).systemExpire(88L, "用户删除资料背景图");
    }

    @Test
    @DisplayName("最新头像仍在审核时不允许重复提交")
    void shouldRejectDuplicateSubmissionWhileReviewing() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        AppUserAuditRecord latest = new AppUserAuditRecord();
        latest.setStatus(AppUserAuditStatusEnum.REVIEWING.getCode());
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR)).thenReturn(latest);

        AvatarSubmitReq req = new AvatarSubmitReq();
        req.setAvatarSource("CAMERA");
        req.setAvatarUrl("https://static.example.com/avatar/cropped.jpg");

        assertThatThrownBy(() -> profileMediaService.submitAvatar(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("审核中");
        verify(auditService, never()).submit(any());
        verify(appUserDao, never()).updateById(any());
    }

    @Test
    @DisplayName("头像来源只允许拍照或相册")
    void shouldRejectUnsupportedAvatarSource() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);

        AvatarSubmitReq req = new AvatarSubmitReq();
        req.setAvatarSource("UNKNOWN");
        req.setAvatarUrl("https://static.example.com/avatar/cropped.jpg");
        when(profileDictionaryService.requireCode("app_avatar_source", "UNKNOWN", "头像来源"))
                .thenThrow(new BusinessException("头像来源编码不存在或已停用"));

        assertThatThrownBy(() -> profileMediaService.submitAvatar(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("头像来源");
        verify(auditService, never()).submit(any());
    }

    @Test
    @DisplayName("头像机审拒绝使用后台配置的图片安全提示")
    void shouldUseConfiguredImageSafetyMessage() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR)).thenReturn(null);
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(101L);
            return record;
        });
        when(imageSafetyProvider.check(any(), any(), any()))
                .thenReturn(ProviderCheckResult.unsafe("mock-image-safety", "{}", true, null));
        org.mockito.Mockito.doAnswer(invocation -> {
            ExternalProviderTask task = invocation.getArgument(0);
            task.setId(301L);
            return null;
        }).when(externalProviderTaskDao).insert(any());
        when(runtimeConfigResolver.copyText(configSnapshot, "safety_image_failed", "图片安全审核未通过"))
                .thenReturn("当前图片未通过安全审核，请重新上传");

        AvatarSubmitReq req = new AvatarSubmitReq();
        req.setAvatarSource("ALBUM");
        req.setAvatarUrl("https://static.example.com/avatar/cropped.jpg");

        profileMediaService.submitAvatar(7L, req);

        verify(auditService).machineReject(101L, 301L, "{}", "当前图片未通过安全审核，请重新上传");
    }

    @Test
    @DisplayName("头像来源字典停用后即使是历史合法code也拒绝提交")
    void shouldRejectAvatarSourceDisabledByDictionary() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(profileDictionaryService.requireCode("app_avatar_source", "ALBUM", "头像来源"))
                .thenThrow(new BusinessException("头像来源编码不存在或已停用"));

        AvatarSubmitReq req = new AvatarSubmitReq();
        req.setAvatarSource("ALBUM");
        req.setAvatarUrl("https://static.example.com/avatar/cropped.jpg");

        assertThatThrownBy(() -> profileMediaService.submitAvatar(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("头像来源编码不存在或已停用");
        verify(auditService, never()).submit(any());
    }

    @Test
    @DisplayName("媒体提交缺少文件大小时拒绝进入审核")
    void shouldRejectMediaWithoutFileSize() {
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        ProfileMediaSubmitReq album = mediaReq("ALBUM", "https://static.example.com/album.jpg");
        album.setFileSizeBytes(null);

        assertThatThrownBy(() -> profileMediaService.submitMedia(7L, album))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("文件大小不能为空");
        verify(auditService, never()).submit(any());
    }

    @Test
    @DisplayName("背景图即使运行配置错误放大上限也只允许一张待审核记录")
    void shouldEnforceSinglePendingProfileBackground() {
        when(runtimeConfigResolver.uploadRule(configSnapshot, "profileBg", 1, 10))
                .thenReturn(new Prd01RuntimeConfigResolver.UploadRule(4, 10, List.of("jpg", "jpeg", "png")));
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);
        when(auditRecordDao.count(any())).thenReturn(1L);
        ProfileMediaSubmitReq background = mediaReq("PROFILE_BG", "https://static.example.com/bg.jpg");

        assertThatThrownBy(() -> profileMediaService.submitMedia(7L, background))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("上传数量不能超过 1 张");
        verify(auditService, never()).submit(any());
    }

    private ProfileMediaSubmitReq mediaReq(String mediaType, String mediaUrl) {
        ProfileMediaSubmitReq req = new ProfileMediaSubmitReq();
        req.setMediaType(mediaType);
        req.setMediaUrl(mediaUrl);
        req.setThumbUrl(mediaUrl.replace(".jpg", "-thumb.jpg"));
        req.setFileSizeBytes(1024L);
        req.setSortOrder(1);
        return req;
    }
}

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
import com.spacetime.miniapp.dto.request.AvatarSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.response.AvatarSubmitVO;
import com.spacetime.miniapp.service.impl.ProfileMediaServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @InjectMocks
    private ProfileMediaServiceImpl profileMediaService;

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

        assertThatThrownBy(() -> profileMediaService.submitAvatar(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("头像来源");
        verify(auditService, never()).submit(any());
    }

    private ProfileMediaSubmitReq mediaReq(String mediaType, String mediaUrl) {
        ProfileMediaSubmitReq req = new ProfileMediaSubmitReq();
        req.setMediaType(mediaType);
        req.setMediaUrl(mediaUrl);
        req.setThumbUrl(mediaUrl.replace(".jpg", "-thumb.jpg"));
        req.setSortOrder(1);
        return req;
    }
}

package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserProfileMediaDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserProfileMedia;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.service.impl.ProfileMediaServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProfileMediaService L3 测试")
class ProfileMediaServiceTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserVerificationDao verificationDao;
    @Mock
    private AppUserProfileMediaDao profileMediaDao;

    @InjectMocks
    private ProfileMediaServiceImpl service;

    private AppUser user;
    private AppUserVerification verification;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L);
        verification = new AppUserVerification();
        verification.setUserId(1L);
    }

    @Test
    @DisplayName("提交头像媒体后进入 MACHINE/PENDING 并重置头像认证状态")
    void shouldSubmitAvatarMediaAsPendingMachineAudit() {
        when(appUserDao.selectById(1L)).thenReturn(user);
        when(verificationDao.selectOne(any())).thenReturn(verification);

        var vo = service.submitMedia(1L, request("AVATAR", "https://cdn.example.com/avatar.jpg"));

        assertThat(vo.getMediaType()).isEqualTo("AVATAR");
        assertThat(vo.getMediaUrl()).isEqualTo("https://cdn.example.com/avatar.jpg");
        assertThat(vo.getAuditStatus()).isEqualTo("PENDING");
        assertThat(vo.getAuditSource()).isEqualTo("MACHINE");
        verify(profileMediaDao).insert(argThat(media ->
                "AVATAR".equals(media.getMediaType())
                        && "PENDING".equals(media.getAuditStatus())
                        && "MACHINE".equals(media.getAuditSource())
                        && !Boolean.TRUE.equals(media.getCurrentEffective())));
        verify(appUserDao).updateById(argThat(updated ->
                "https://cdn.example.com/avatar.jpg".equals(updated.getAvatar())));
        verify(verificationDao).updateById(argThat(updated ->
                "PENDING".equals(updated.getAvatarVerifyStatus())
                        && "MACHINE".equals(updated.getAvatarAuditSource())));
    }

    @Test
    @DisplayName("删除媒体只能删除自己的记录")
    void shouldRejectDeletingOtherUsersMedia() {
        AppUserProfileMedia media = new AppUserProfileMedia();
        media.setId(99L);
        media.setUserId(2L);
        when(profileMediaDao.selectById(99L)).thenReturn(media);

        assertThatThrownBy(() -> service.deleteMedia(1L, 99L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不存在");
    }

    private ProfileMediaSubmitReq request(String mediaType, String mediaUrl) {
        ProfileMediaSubmitReq req = new ProfileMediaSubmitReq();
        req.setMediaType(mediaType);
        req.setMediaUrl(mediaUrl);
        req.setThumbUrl(mediaUrl + "?thumb=1");
        req.setSortOrder(1);
        return req;
    }
}

package com.spacetime.common.service;

import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.service.impl.AppUserAuditContentServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 审核内容统一投影规则测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("审核内容统一投影服务")
class AppUserAuditContentServiceTest {

    @Mock
    private AppUserAuditService auditService;
    @Mock
    private AppUserAuditRecordDao auditRecordDao;

    @InjectMocks
    private AppUserAuditContentServiceImpl contentService;

    @Test
    @DisplayName("本人看到最新头像，其他人只看到最新已通过头像")
    void shouldResolveOwnerAndPublicAvatarByLatestRecord() {
        AppUserAuditRecord rejected = record(11L, 7L, AppUserAuditTypeEnum.AVATAR,
                AppUserAuditStatusEnum.REJECTED, "https://static.example.com/rejected.jpg");
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR)).thenReturn(rejected);

        assertThat(contentService.ownerAvatar(7L)).isEqualTo(rejected.getMediaUrl());
        assertThat(contentService.publicAvatar(7L)).isNull();

        rejected.setStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        assertThat(contentService.publicAvatar(7L)).isEqualTo(rejected.getMediaUrl());
    }

    @Test
    @DisplayName("开放文字本人取最新提交，对外取最近已通过")
    void shouldResolveOwnerAndPublicTextSeparately() {
        AppUserAuditRecord latest = record(12L, 7L, AppUserAuditTypeEnum.ABOUT_ME,
                AppUserAuditStatusEnum.PENDING, null);
        latest.setContentText("最新待审核内容");
        AppUserAuditRecord approved = record(10L, 7L, AppUserAuditTypeEnum.ABOUT_ME,
                AppUserAuditStatusEnum.APPROVED, null);
        approved.setContentText("最近已通过内容");
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.ABOUT_ME)).thenReturn(latest);
        when(auditService.latestEffectiveRecord(7L, AppUserAuditTypeEnum.ABOUT_ME)).thenReturn(approved);

        assertThat(contentService.ownerText(7L, AppUserAuditTypeEnum.ABOUT_ME))
                .isEqualTo("最新待审核内容");
        assertThat(contentService.publicText(7L, AppUserAuditTypeEnum.ABOUT_ME))
                .isEqualTo("最近已通过内容");
    }

    @Test
    @DisplayName("批量头像查询先选每个用户最新记录，再判断是否通过")
    void shouldResolvePublicAvatarsInBatchWithoutFallingBackToOldApproval() {
        AppUserAuditRecord user7OldApproved = record(21L, 7L, AppUserAuditTypeEnum.AVATAR,
                AppUserAuditStatusEnum.APPROVED, "https://static.example.com/7-old.jpg");
        user7OldApproved.setSubmitTime(LocalDateTime.of(2026, 7, 1, 10, 0));
        AppUserAuditRecord user7LatestRejected = record(22L, 7L, AppUserAuditTypeEnum.AVATAR,
                AppUserAuditStatusEnum.REJECTED, "https://static.example.com/7-new.jpg");
        user7LatestRejected.setSubmitTime(LocalDateTime.of(2026, 7, 2, 10, 0));
        AppUserAuditRecord user8Approved = record(23L, 8L, AppUserAuditTypeEnum.AVATAR,
                AppUserAuditStatusEnum.APPROVED, "https://static.example.com/8.jpg");
        user8Approved.setSubmitTime(LocalDateTime.of(2026, 7, 3, 10, 0));
        when(auditRecordDao.selectList(any())).thenReturn(
                List.of(user8Approved, user7LatestRejected, user7OldApproved));

        Map<Long, String> result = contentService.publicAvatars(List.of(7L, 8L));

        assertThat(result).doesNotContainKey(7L);
        assertThat(result).containsEntry(8L, "https://static.example.com/8.jpg");
    }

    @Test
    @DisplayName("本人和公开相册的单人及批量查询都遵循编辑槽位，不受审核完成顺序影响")
    void shouldKeepAlbumSlotOrderAcrossAllProjections() {
        AppUserAuditRecord first = album(31L, 7L, 0);
        AppUserAuditRecord second = album(33L, 7L, 1);
        AppUserAuditRecord third = album(32L, 7L, 2);
        List<AppUserAuditRecord> reversed = List.of(third, second, first);
        when(auditService.effectiveRecords(7L, AppUserAuditTypeEnum.ALBUM_PHOTO)).thenReturn(reversed);
        when(auditRecordDao.selectList(any())).thenReturn(reversed);
        List<String> expected = List.of(first.getMediaUrl(), second.getMediaUrl(), third.getMediaUrl());

        assertThat(contentService.publicAlbumPhotos(7L)).containsExactlyElementsOf(expected);
        assertThat(contentService.ownerAlbumPhotos(7L)).containsExactlyElementsOf(expected);
        assertThat(contentService.publicAlbumPhotos(List.of(7L)).get(7L)).containsExactlyElementsOf(expected);
        assertThat(contentService.ownerAlbumPhotos(List.of(7L)).get(7L)).containsExactlyElementsOf(expected);
    }

    @Test
    @DisplayName("历史缺失或重复槽位按提交时间和主键稳定排序，批量查询不混入其他用户")
    void shouldStabilizeLegacyAlbumOrderPerUser() {
        AppUserAuditRecord first = album(41L, 7L, 0);
        first.setMaterialJson(null);
        AppUserAuditRecord second = album(42L, 7L, 0);
        second.setMaterialJson("{\"sortOrder\":999999999999999}");
        AppUserAuditRecord other = album(43L, 8L, 0);
        when(auditService.effectiveRecords(7L, AppUserAuditTypeEnum.ALBUM_PHOTO))
                .thenReturn(List.of(second, first));
        when(auditRecordDao.selectList(any())).thenReturn(List.of(other, second, first));

        assertThat(contentService.publicAlbumPhotos(7L)).containsExactly(first.getMediaUrl(), second.getMediaUrl());
        Map<Long, List<String>> result = contentService.publicAlbumPhotos(List.of(7L, 8L));
        assertThat(result.get(7L)).containsExactly(first.getMediaUrl(), second.getMediaUrl());
        assertThat(result.get(8L)).containsExactly(other.getMediaUrl());
    }

    private AppUserAuditRecord album(Long id, Long userId, int slot) {
        AppUserAuditRecord record = record(id, userId, AppUserAuditTypeEnum.ALBUM_PHOTO,
                AppUserAuditStatusEnum.APPROVED, "https://static.example.com/" + id + ".jpg");
        record.setMaterialJson("{\"sortOrder\":" + slot + "}");
        record.setSubmitTime(LocalDateTime.of(2026, 10, 19, 10, 0));
        return record;
    }

    private AppUserAuditRecord record(Long id, Long userId, AppUserAuditTypeEnum type,
            AppUserAuditStatusEnum status, String mediaUrl) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id);
        record.setUserId(userId);
        record.setAuditType(type.getCode());
        record.setStatus(status.getCode());
        record.setMediaUrl(mediaUrl);
        record.setSubmitTime(LocalDateTime.now());
        return record;
    }
}

package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.AppUserStatsVO;
import com.spacetime.admin.service.impl.AppUserAdminServiceImpl;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImportBatchDao;
import com.spacetime.common.dao.AppUserImportRowDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.Prd01ProfileCompletenessCalculator;
import com.spacetime.common.service.ProfileDictionaryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * 管理后台小程序用户服务测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AppUserAdminService L3 测试")
class AppUserAdminServiceImplTest {

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserAuditRecordDao auditRecordDao;
    @Mock
    private AppUserImportBatchDao importBatchDao;
    @Mock
    private AppUserImportRowDao importRowDao;
    @Mock
    private ContentOperationLogDao contentOperationLogDao;
    @Mock
    private ProfileDictionaryService profileDictionaryService;
    @Mock
    private AppUserAuditContentService auditContentService;
    @Mock
    private Prd01ProfileCompletenessCalculator profileCompletenessCalculator;

    @InjectMocks
    private AppUserAdminServiceImpl service;

    @Test
    @DisplayName("用户详情关联头像只展示当前对外生效头像")
    void shouldUsePublicAvatarForRelatedUser() {
        AppUser user = new AppUser();
        user.setId(71L);
        user.setNickname("头像规则用户");
        user.setAccountStatus("NORMAL");
        when(appUserDao.selectById(71L)).thenReturn(user);
        when(auditRecordDao.selectList(any())).thenReturn(List.of());
        when(profileDictionaryService.labels(any())).thenReturn(Map.of());
        when(auditContentService.publicAvatar(71L)).thenReturn("https://oss.example.com/avatar-approved.jpg");

        AppUserDetailVO detail = service.getUserDetail(71L);

        assertThat(detail.getAvatar()).isEqualTo("https://oss.example.com/avatar-approved.jpg");
    }

    @Test
    @DisplayName("用户列表使用单批审核事实组装卡片且不触发逐用户完整度查询")
    void shouldAssembleUserPageFromOneAuditBatch() {
        AppUser first = user(1L, "用户一");
        AppUser second = user(2L, "用户二");
        Page<AppUser> page = new Page<>(1, 9, 2);
        page.setRecords(List.of(first, second));
        when(appUserDao.selectPage(any(), any())).thenReturn(page);

        AppUserAuditRecord avatar = audit(101L, 1L, AppUserAuditTypeEnum.AVATAR,
                AppUserAuditStatusEnum.APPROVED, "https://oss.example.com/avatar-1.jpg", 3);
        AppUserAuditRecord albumNew = audit(103L, 1L, AppUserAuditTypeEnum.ALBUM_PHOTO,
                AppUserAuditStatusEnum.PENDING, "https://oss.example.com/album-2.jpg", 2);
        AppUserAuditRecord albumOld = audit(102L, 1L, AppUserAuditTypeEnum.ALBUM_PHOTO,
                AppUserAuditStatusEnum.APPROVED, "https://oss.example.com/album-1.jpg", 1);
        when(auditRecordDao.selectList(any())).thenReturn(List.of(avatar, albumNew, albumOld));
        when(profileDictionaryService.labels(any())).thenReturn(Map.of());

        Prd01ProfileCompletenessCalculator.ProfileCompletenessRules rules =
                new Prd01ProfileCompletenessCalculator.ProfileCompletenessRules(Map.of());
        when(profileCompletenessCalculator.loadRules()).thenReturn(rules);
        when(profileCompletenessCalculator.calculate(any(AppUser.class), same(rules), anyMap(), anySet()))
                .thenReturn(88);

        AppUserPageReq req = new AppUserPageReq();
        req.setPage(1);
        req.setSize(9);
        Page<com.spacetime.admin.dto.response.AppUserListVO> result = service.getUserPage(req);

        assertThat(result.getRecords()).hasSize(2);
        assertThat(result.getRecords().get(0).getAvatar()).isEqualTo("https://oss.example.com/avatar-1.jpg");
        assertThat(result.getRecords().get(0).getPhotos())
                .isEqualTo("[\"https://oss.example.com/album-1.jpg\",\"https://oss.example.com/album-2.jpg\"]");
        assertThat(result.getRecords().get(0).getAvatarVerifyStatus()).isEqualTo("APPROVED");
        assertThat(result.getRecords().get(0).getProfileScore()).isEqualTo(88);
        assertThat(result.getRecords().get(1).getAvatarVerifyStatus()).isEqualTo("NOT_SUBMITTED");

        verify(auditRecordDao, times(1)).selectList(any());
        verify(profileCompletenessCalculator, times(1)).loadRules();
        verify(profileCompletenessCalculator, times(2))
                .calculate(any(AppUser.class), same(rules), anyMap(), anySet());
        verify(profileCompletenessCalculator, never()).calculate(any(AppUser.class));
        verifyNoInteractions(auditContentService);
    }

    @Test
    @DisplayName("用户统计只返回当前用户数和核心准入开放数")
    void shouldReturnAppUserStatsFromCountQueries() {
        when(appUserDao.count(any())).thenReturn(63L, 41L);

        AppUserStatsVO stats = service.getUserStats();

        assertThat(stats.getCurrentUserCount()).isEqualTo(63L);
        assertThat(stats.getCoreAccessAllowedCount()).isEqualTo(41L);
        verify(appUserDao, times(2)).count(any());
        verifyNoInteractions(auditRecordDao, auditContentService, profileCompletenessCalculator,
                profileDictionaryService);
    }

    private AppUser user(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setAccountStatus("NORMAL");
        user.setFirstLoginCompleted(1);
        return user;
    }

    private AppUserAuditRecord audit(Long id, Long userId, AppUserAuditTypeEnum type,
            AppUserAuditStatusEnum status, String mediaUrl, int minute) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id);
        record.setUserId(userId);
        record.setAuditType(type.getCode());
        record.setStatus(status.getCode());
        record.setMediaUrl(mediaUrl);
        record.setSubmitTime(LocalDateTime.of(2026, 7, 14, 1, minute));
        return record;
    }
}

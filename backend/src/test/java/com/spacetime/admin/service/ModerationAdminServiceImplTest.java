package com.spacetime.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.ModerationDetailVO;
import com.spacetime.admin.dto.response.VerificationStatsVO;
import com.spacetime.admin.service.impl.ModerationAdminServiceImpl;
import com.spacetime.common.dao.AppUserAuditHistoryDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditHistory;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditActionEnum;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.AppUserAuditContentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 管理后台内容审核服务测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ModerationAdminService L3 测试")
class ModerationAdminServiceImplTest {

    @Mock
    private AppUserAuditRecordDao auditRecordDao;

    @Mock
    private AppUserAuditHistoryDao historyDao;

    @Mock
    private AppUserAuditService auditService;

    @Mock
    private AppUserDao appUserDao;
    @Mock
    private AppUserAuditContentService auditContentService;

    @InjectMocks
    private ModerationAdminServiceImpl service;

    @Test
    @DisplayName("资料图片和开放文字统计使用统一审核表真实计数")
    void shouldCountPhotoAndTextStatsFromAuditRecordTable() {
        when(auditRecordDao.count(any())).thenReturn(3L, 1L, 4L, 2L, 5L, 6L, 7L, 8L, 9L, 10L);

        VerificationStatsVO photoStats = service.getPhotoStats();
        VerificationStatsVO textStats = service.getTextStats();

        assertThat(photoStats.getPendingCount()).isEqualTo(3L);
        assertThat(photoStats.getReviewingCount()).isEqualTo(1L);
        assertThat(photoStats.getApprovedTodayCount()).isEqualTo(4L);
        assertThat(photoStats.getRejectedTodayCount()).isEqualTo(2L);
        assertThat(photoStats.getExpiredCount()).isEqualTo(5L);
        assertThat(textStats.getPendingCount()).isEqualTo(6L);
        assertThat(textStats.getReviewingCount()).isEqualTo(7L);
        assertThat(textStats.getApprovedTodayCount()).isEqualTo(8L);
        assertThat(textStats.getRejectedTodayCount()).isEqualTo(9L);
        assertThat(textStats.getExpiredCount()).isEqualTo(10L);
        verify(auditRecordDao, times(10)).count(any());
    }

    @Test
    @DisplayName("资料图片详情包含原图和审核历史分页")
    void shouldReturnPhotoDetailWithHistoryPage() {
        AppUserAuditRecord record = auditRecord(31L, 41L, AppUserAuditTypeEnum.ALBUM_PHOTO);
        record.setMediaUrl("https://oss.example.com/album-a.jpg");
        when(auditRecordDao.selectById(31L)).thenReturn(record);
        when(appUserDao.selectById(41L)).thenReturn(appUser(41L));
        when(auditContentService.publicAvatar(41L)).thenReturn("https://oss.example.com/avatar-approved.jpg");
        when(historyDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(historyPage(31L));

        ModerationDetailVO detail = service.getPhotoDetail(31L, 1, 5);

        assertThat(detail.getContentFull()).isEqualTo("https://oss.example.com/album-a.jpg");
        assertThat(detail.getAvatar()).isEqualTo("https://oss.example.com/avatar-approved.jpg");
        assertThat(detail.getHistoryPage().getRecords()).hasSize(1);
    }

    @Test
    @DisplayName("开放文字详情包含全文和审核历史分页")
    void shouldReturnTextDetailWithHistoryPage() {
        AppUserAuditRecord record = auditRecord(32L, 42L, AppUserAuditTypeEnum.ABOUT_ME);
        record.setContentText("希望认真了解彼此，先从真实介绍开始。");
        when(auditRecordDao.selectById(32L)).thenReturn(record);
        when(appUserDao.selectById(42L)).thenReturn(appUser(42L));
        when(historyDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(historyPage(32L));

        ModerationDetailVO detail = service.getTextDetail(32L, 1, 5);

        assertThat(detail.getContentFull()).contains("真实介绍");
        assertThat(detail.getHistoryPage().getRecords()).hasSize(1);
    }

    @Test
    @DisplayName("资料问答详情展示所属分类和具体题目标题")
    void shouldReturnProfileQaTitleInTextDetail() {
        AppUserAuditRecord record = auditRecord(33L, 43L, AppUserAuditTypeEnum.PROFILE_QA);
        record.setContentText("喜欢轻松自然的见面方式，也愿意一起参加看展和散步。");
        record.setMaterialJson("{\"questionKey\":\"preferredActivities\",\"questionTitle\":\"喜欢的见面活动\"}");
        when(auditRecordDao.selectById(33L)).thenReturn(record);
        when(appUserDao.selectById(43L)).thenReturn(appUser(43L));
        when(historyDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(historyPage(33L));

        ModerationDetailVO detail = service.getTextDetail(33L, 1, 5);

        assertThat(detail.getContentField()).isEqualTo("资料问答");
        assertThat(detail.getContentTitle()).isEqualTo("喜欢的见面活动");
        assertThat(detail.getQuestionKey()).isEqualTo("preferredActivities");
    }

    private AppUserAuditRecord auditRecord(Long id, Long userId, AppUserAuditTypeEnum type) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id);
        record.setUserId(userId);
        record.setAuditType(type.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setSubmitTime(LocalDateTime.of(2026, 7, 1, 10, 0));
        return record;
    }

    private AppUser appUser(Long userId) {
        AppUser user = new AppUser();
        user.setId(userId);
        user.setNickname("内容审核用户" + userId);
        return user;
    }

    private Page<AppUserAuditHistory> historyPage(Long recordId) {
        AppUserAuditHistory history = new AppUserAuditHistory();
        history.setId(200L + recordId);
        history.setAuditRecordId(recordId);
        history.setFromStatus(AppUserAuditStatusEnum.PENDING.getCode());
        history.setToStatus(AppUserAuditStatusEnum.APPROVED.getCode());
        history.setAction(AppUserAuditActionEnum.MACHINE_PASS.getCode());
        history.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        history.setOperatorName("Provider");
        history.setCreateTime(LocalDateTime.of(2026, 7, 1, 10, 20));
        Page<AppUserAuditHistory> page = new Page<>(1, 5, 1);
        page.setRecords(List.of(history));
        return page;
    }
}

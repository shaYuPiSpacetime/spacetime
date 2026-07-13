package com.spacetime.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.AuditHistoryVO;
import com.spacetime.admin.dto.response.VerificationAuditDetailVO;
import com.spacetime.admin.dto.response.VerificationStatsVO;
import com.spacetime.admin.service.impl.VerificationAdminServiceImpl;
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
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.constant.ProfileDictType;
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
 * 管理后台认证审核服务测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("VerificationAdminService L3 测试")
class VerificationAdminServiceImplTest {

    @Mock
    private AppUserAuditRecordDao auditRecordDao;

    @Mock
    private AppUserAuditHistoryDao historyDao;

    @Mock
    private AppUserAuditService auditService;

    @Mock
    private AppUserDao appUserDao;

    @Mock
    private ProfileDictionaryService profileDictionaryService;
    @Mock
    private AppUserAuditContentService auditContentService;

    @InjectMocks
    private VerificationAdminServiceImpl service;

    @Test
    @DisplayName("头像统计使用统一审核表真实计数")
    void shouldCountAvatarStatsFromAuditRecordTable() {
        when(auditRecordDao.count(any())).thenReturn(2L, 1L, 3L, 4L, 5L);

        VerificationStatsVO stats = service.getAvatarStats();

        assertThat(stats.getPendingCount()).isEqualTo(2L);
        assertThat(stats.getReviewingCount()).isEqualTo(1L);
        assertThat(stats.getApprovedTodayCount()).isEqualTo(3L);
        assertThat(stats.getRejectedTodayCount()).isEqualTo(4L);
        assertThat(stats.getExpiredCount()).isEqualTo(5L);
        verify(auditRecordDao, times(5)).count(any());
    }

    @Test
    @DisplayName("实名和学历统计也使用统一审核表真实计数")
    void shouldCountRealNameAndEducationStatsFromAuditRecordTable() {
        when(auditRecordDao.count(any())).thenReturn(7L, 2L, 5L, 1L, 3L, 9L, 4L, 6L, 8L, 10L);

        VerificationStatsVO realNameStats = service.getRealNameStats();
        VerificationStatsVO educationStats = service.getEducationStats();

        assertThat(realNameStats.getPendingCount()).isEqualTo(7L);
        assertThat(realNameStats.getReviewingCount()).isEqualTo(2L);
        assertThat(realNameStats.getApprovedTodayCount()).isEqualTo(5L);
        assertThat(realNameStats.getRejectedTodayCount()).isEqualTo(1L);
        assertThat(realNameStats.getExpiredCount()).isEqualTo(3L);
        assertThat(educationStats.getPendingCount()).isEqualTo(9L);
        assertThat(educationStats.getReviewingCount()).isEqualTo(4L);
        assertThat(educationStats.getApprovedTodayCount()).isEqualTo(6L);
        assertThat(educationStats.getRejectedTodayCount()).isEqualTo(8L);
        assertThat(educationStats.getExpiredCount()).isEqualTo(10L);
        verify(auditRecordDao, times(10)).count(any());
    }

    @Test
    @DisplayName("头像详情包含头像预览地址和审核历史分页")
    void shouldReturnAvatarDetailWithHistoryPage() {
        AppUserAuditRecord record = auditRecord(10L, 20L, AppUserAuditTypeEnum.AVATAR);
        record.setStatus(AppUserAuditStatusEnum.REJECTED.getCode());
        record.setMediaUrl("https://oss.example.com/avatar-a.jpg");
        record.setThumbUrl("https://oss.example.com/avatar-a-thumb.jpg");
        record.setRejectReason("图片不清晰");
        when(auditRecordDao.selectById(10L)).thenReturn(record);

        AppUser user = appUser(20L);
        when(appUserDao.selectById(20L)).thenReturn(user);
        when(auditContentService.publicAvatar(20L)).thenReturn("https://oss.example.com/avatar-approved.jpg");
        when(auditService.certificationApprovedCount(20L)).thenReturn(2);
        when(historyDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(historyPage(10L));

        VerificationAuditDetailVO detail = service.getAvatarDetail(10L, 1, 2);

        assertThat(detail.getMediaUrl()).isEqualTo("https://oss.example.com/avatar-a.jpg");
        assertThat(detail.getAvatar()).isEqualTo("https://oss.example.com/avatar-approved.jpg");
        assertThat(detail.getThumbUrl()).isEqualTo("https://oss.example.com/avatar-a-thumb.jpg");
        assertThat(detail.getRejectReason()).isEqualTo("图片不清晰");
        assertThat(detail.getHistoryPage().getTotal()).isEqualTo(1);
        assertThat(detail.getHistoryPage().getRecords())
                .extracting(AuditHistoryVO::getAction)
                .containsExactly(AppUserAuditActionEnum.MANUAL_REJECT.getCode());
    }

    @Test
    @DisplayName("实名详情返回脱敏字段、明文字段和审核历史分页")
    void shouldReturnRealNameDetailWithSensitiveFieldsAndHistoryPage() {
        AppUserAuditRecord record = auditRecord(11L, 21L, AppUserAuditTypeEnum.REAL_NAME);
        record.setRealName("张三");
        record.setBoundPhone("13800138000");
        record.setIdCard("330102199001011234");
        when(auditRecordDao.selectById(11L)).thenReturn(record);
        when(appUserDao.selectById(21L)).thenReturn(appUser(21L));
        when(auditService.certificationApprovedCount(21L)).thenReturn(1);
        when(historyDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(historyPage(11L));

        VerificationAuditDetailVO detail = service.getRealNameDetail(11L, 1, 5);

        assertThat(detail.getFields()).hasSize(3);
        assertThat(detail.getFields().get(0).getValue()).contains("*");
        assertThat(detail.getSensitiveFields())
                .extracting("value")
                .contains("张三", "13800138000", "330102199001011234");
        assertThat(detail.getHistoryPage().getRecords()).hasSize(1);
    }

    @Test
    @DisplayName("学历详情按认证方式展示材料值并带审核历史分页")
    void shouldReturnEducationDetailWithMethodSpecificMaterialAndHistoryPage() {
        AppUserAuditRecord record = auditRecord(12L, 22L, AppUserAuditTypeEnum.EDUCATION);
        record.setEducationMethod("DIPLOMA_NO");
        record.setSchoolName("星河大学");
        record.setRealName("李四");
        record.setMaterialJson("{\"diplomaNo\":\"CERT-2026-001\"}");
        when(auditRecordDao.selectById(12L)).thenReturn(record);

        AppUser user = appUser(22L);
        user.setIdentity("STUDENT");
        user.setSchool("旧学校");
        user.setEducationLevel("BACHELOR");
        when(appUserDao.selectById(22L)).thenReturn(user);
        when(profileDictionaryService.label(ProfileDictType.IDENTITY, "STUDENT")).thenReturn("在校生");
        when(profileDictionaryService.label(ProfileDictType.EDUCATION_LEVEL, "BACHELOR")).thenReturn("本科");
        when(auditService.certificationApprovedCount(22L)).thenReturn(1);
        when(historyDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(historyPage(12L));

        VerificationAuditDetailVO detail = service.getEducationDetail(12L, 1, 5);

        assertThat(detail.getFields())
                .anySatisfy(field -> {
                    assertThat(field.getLabel()).isEqualTo("证书编号");
                    assertThat(field.getValue()).isEqualTo("CERT-2026-001");
                });
        assertThat(detail.getFields())
                .anySatisfy(field -> {
                    assertThat(field.getLabel()).isEqualTo("身份");
                    assertThat(field.getValue()).isEqualTo("在校生");
                });
        assertThat(detail.getFields())
                .anySatisfy(field -> {
                    assertThat(field.getLabel()).isEqualTo("学历");
                    assertThat(field.getValue()).isEqualTo("本科");
                });
        assertThat(detail.getHistoryPage().getRecords()).hasSize(1);
    }

    private AppUserAuditRecord auditRecord(Long id, Long userId, AppUserAuditTypeEnum type) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id);
        record.setUserId(userId);
        record.setAuditType(type.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setAuditSource(AuditSourceEnum.MANUAL.getCode());
        record.setSubmitTime(LocalDateTime.of(2026, 7, 1, 10, 0));
        return record;
    }

    private AppUser appUser(Long userId) {
        AppUser user = new AppUser();
        user.setId(userId);
        user.setNickname("审核用户" + userId);
        return user;
    }

    private Page<AppUserAuditHistory> historyPage(Long recordId) {
        AppUserAuditHistory history = new AppUserAuditHistory();
        history.setId(100L + recordId);
        history.setAuditRecordId(recordId);
        history.setFromStatus(AppUserAuditStatusEnum.PENDING.getCode());
        history.setToStatus(AppUserAuditStatusEnum.REJECTED.getCode());
        history.setAction(AppUserAuditActionEnum.MANUAL_REJECT.getCode());
        history.setAuditSource(AuditSourceEnum.MANUAL.getCode());
        history.setReason("图片不清晰");
        history.setOperatorName("peter");
        history.setCreateTime(LocalDateTime.of(2026, 7, 1, 10, 30));
        Page<AppUserAuditHistory> page = new Page<>(1, 5, 1);
        page.setRecords(List.of(history));
        return page;
    }
}

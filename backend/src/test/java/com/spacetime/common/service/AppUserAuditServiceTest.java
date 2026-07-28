package com.spacetime.common.service;

import com.spacetime.common.dao.AppUserAuditHistoryDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.entity.AppUserAuditHistory;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.service.impl.AppUserAuditServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * App 用户统一审核服务单元测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AppUserAuditService L3 测试")
class AppUserAuditServiceTest {

    @Mock
    private AppUserAuditRecordDao recordDao;

    @Mock
    private AppUserAuditHistoryDao historyDao;
    @Mock
    private PromotionEventInboxService promotionEventInboxService;

    @InjectMocks
    private AppUserAuditServiceImpl auditService;

    @Test
    @DisplayName("提交审核记录时补齐默认值并写入提交历史")
    void shouldFillDefaultsAndAppendSubmitHistory() {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(1L);
        record.setUserId(10L);
        record.setAuditType(AppUserAuditTypeEnum.ABOUT_ME.getCode());

        auditService.submit(record);

        assertThat(record.getAuditGroup()).isEqualTo("TEXT");
        assertThat(record.getStatus()).isEqualTo(AppUserAuditStatusEnum.PENDING.getCode());
        assertThat(record.getAuditSource()).isEqualTo(AuditSourceEnum.MACHINE.getCode());
        assertThat(record.getSubmitTime()).isNotNull();
        verify(recordDao).insert(record);

        ArgumentCaptor<AppUserAuditHistory> historyCaptor = ArgumentCaptor.forClass(AppUserAuditHistory.class);
        verify(historyDao).insert(historyCaptor.capture());
        AppUserAuditHistory history = historyCaptor.getValue();
        assertThat(history.getAuditRecordId()).isEqualTo(1L);
        assertThat(history.getUserId()).isEqualTo(10L);
        assertThat(history.getAuditType()).isEqualTo(AppUserAuditTypeEnum.ABOUT_ME.getCode());
        assertThat(history.getAction()).isEqualTo("SUBMIT");
        assertThat(history.getToStatus()).isEqualTo(AppUserAuditStatusEnum.PENDING.getCode());
        assertThat(history.getOperatorType()).isEqualTo("USER");
    }

    @Test
    @DisplayName("人工通过审核时更新状态并写历史")
    void shouldApproveAndAppendHistory() {
        AppUserAuditRecord current = record(2L, 10L, AppUserAuditTypeEnum.EDUCATION, AppUserAuditStatusEnum.PENDING);
        when(recordDao.selectById(2L)).thenReturn(current);

        auditService.manualAudit(2L, "APPROVE", null, 99L, "admin");

        assertThat(current.getStatus()).isEqualTo(AppUserAuditStatusEnum.APPROVED.getCode());
        assertThat(current.getAuditSource()).isEqualTo(AuditSourceEnum.MANUAL.getCode());
        assertThat(current.getAuditorId()).isEqualTo(99L);
        verify(recordDao).updateAuditResult(current);

        ArgumentCaptor<AppUserAuditHistory> historyCaptor = ArgumentCaptor.forClass(AppUserAuditHistory.class);
        verify(historyDao).insert(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getAction()).isEqualTo("MANUAL_APPROVE");
        assertThat(historyCaptor.getValue().getOperatorType()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("开放文字审核通过只更新审核记录，不回写用户主表")
    void shouldApproveIntroductionWithoutUserSnapshot() {
        AppUserAuditRecord current = record(5L, 10L, AppUserAuditTypeEnum.ABOUT_ME, AppUserAuditStatusEnum.PENDING);
        current.setContentText("审核内容始终保存在统一审核记录中");
        when(recordDao.selectById(5L)).thenReturn(current);

        auditService.manualAudit(5L, "APPROVE", null, 99L, "admin");

        assertThat(current.getStatus()).isEqualTo(AppUserAuditStatusEnum.APPROVED.getCode());
        assertThat(current.getContentText()).isEqualTo("审核内容始终保存在统一审核记录中");
        verify(recordDao).updateAuditResult(current);
    }

    @Test
    @DisplayName("系统失效会更新状态并写入 SYSTEM_EXPIRE 历史")
    void shouldExpireCurrentRecordBySystem() {
        AppUserAuditRecord current = record(3L, 10L, AppUserAuditTypeEnum.VOICE_INTRO, AppUserAuditStatusEnum.APPROVED);
        when(recordDao.selectById(3L)).thenReturn(current);

        auditService.systemExpire(3L, "user deleted voice");

        assertThat(current.getStatus()).isEqualTo(AppUserAuditStatusEnum.EXPIRED.getCode());
        assertThat(current.getExpiredReason()).isEqualTo("user deleted voice");
        verify(recordDao).updateAuditResult(current);

        ArgumentCaptor<AppUserAuditHistory> historyCaptor = ArgumentCaptor.forClass(AppUserAuditHistory.class);
        verify(historyDao).insert(historyCaptor.capture());
        AppUserAuditHistory history = historyCaptor.getValue();
        assertThat(history.getAction()).isEqualTo("SYSTEM_EXPIRE");
        assertThat(history.getOperatorType()).isEqualTo("SYSTEM");
        assertThat(history.getReason()).isEqualTo("user deleted voice");
    }

    @Test
    @DisplayName("人工驳回和失效会清理另一类原因，避免详情展示旧原因")
    void shouldClearOppositeReasonWhenManualRejectOrExpire() {
        AppUserAuditRecord current = record(4L, 10L, AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.REJECTED);
        current.setRejectReason("old reject");
        when(recordDao.selectById(4L)).thenReturn(current);

        auditService.manualAudit(4L, "EXPIRE", "expired reason", 99L, "admin");

        assertThat(current.getStatus()).isEqualTo(AppUserAuditStatusEnum.EXPIRED.getCode());
        assertThat(current.getRejectReason()).isNull();
        assertThat(current.getExpiredReason()).isEqualTo("expired reason");

        current.setExpiredReason("old expired");
        auditService.manualAudit(4L, "REJECT", "reject reason", 99L, "admin");

        assertThat(current.getStatus()).isEqualTo(AppUserAuditStatusEnum.REJECTED.getCode());
        assertThat(current.getRejectReason()).isEqualTo("reject reason");
        assertThat(current.getExpiredReason()).isNull();
    }

    @Test
    @DisplayName("三重认证等级按实名生效、头像最新通过、学历生效计算")
    void shouldCountTripleCertificationWithUnifiedAuditRules() {
        AppUserAuditRecord realName = record(1L, 10L, AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.APPROVED);
        AppUserAuditRecord avatar = record(2L, 10L, AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.APPROVED);
        AppUserAuditRecord education = record(3L, 10L, AppUserAuditTypeEnum.EDUCATION, AppUserAuditStatusEnum.APPROVED);
        when(recordDao.selectOne(any())).thenReturn(realName, avatar, education);

        int count = auditService.certificationApprovedCount(10L);

        assertThat(count).isEqualTo(3);
    }

    @Test
    @DisplayName("批量认证计数保持实名/学历有效、头像最新通过的统一口径")
    void shouldBatchCountTripleCertificationWithoutPerUserQueries() {
        AppUserAuditRecord realName10 = record(1L, 10L, AppUserAuditTypeEnum.REAL_NAME,
                AppUserAuditStatusEnum.APPROVED);
        AppUserAuditRecord oldAvatar10 = record(2L, 10L, AppUserAuditTypeEnum.AVATAR,
                AppUserAuditStatusEnum.APPROVED);
        oldAvatar10.setSubmitTime(LocalDateTime.now().minusDays(1));
        AppUserAuditRecord latestAvatar10 = record(3L, 10L, AppUserAuditTypeEnum.AVATAR,
                AppUserAuditStatusEnum.REJECTED);
        latestAvatar10.setSubmitTime(LocalDateTime.now());
        AppUserAuditRecord education10 = record(4L, 10L, AppUserAuditTypeEnum.EDUCATION,
                AppUserAuditStatusEnum.APPROVED);
        AppUserAuditRecord realName11 = record(5L, 11L, AppUserAuditTypeEnum.REAL_NAME,
                AppUserAuditStatusEnum.APPROVED);
        AppUserAuditRecord avatar11 = record(6L, 11L, AppUserAuditTypeEnum.AVATAR,
                AppUserAuditStatusEnum.APPROVED);
        AppUserAuditRecord education11 = record(7L, 11L, AppUserAuditTypeEnum.EDUCATION,
                AppUserAuditStatusEnum.APPROVED);
        when(recordDao.selectList(any())).thenReturn(List.of(realName10, oldAvatar10, latestAvatar10,
                education10, realName11, avatar11, education11));

        Map<Long, Integer> result = auditService.certificationApprovedCounts(List.of(10L, 11L));

        assertThat(result).containsEntry(10L, 2).containsEntry(11L, 3);
        verify(recordDao).selectList(any());
    }

    private AppUserAuditRecord record(Long id, Long userId, AppUserAuditTypeEnum type,
            AppUserAuditStatusEnum status) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id);
        record.setUserId(userId);
        record.setAuditGroup(type.getGroup());
        record.setAuditType(type.getCode());
        record.setStatus(status.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        return record;
    }
}

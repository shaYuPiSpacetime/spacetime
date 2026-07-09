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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * App 用户统一审核服务单元测试。
 * 覆盖统一审核表上线后的状态流转、当前有效标记和审核历史写入。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AppUserAuditService L3 测试")
class AppUserAuditServiceTest {

    @Mock
    private AppUserAuditRecordDao recordDao;

    @Mock
    private AppUserAuditHistoryDao historyDao;

    @InjectMocks
    private AppUserAuditServiceImpl auditService;

    @Test
    @DisplayName("提交审核记录时补齐分组、默认状态、默认来源并写入提交历史")
    void shouldFillDefaultsAndAppendSubmitHistory() {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(1L);
        record.setUserId(10L);
        record.setAuditType(AppUserAuditTypeEnum.ABOUT_ME.getCode());

        auditService.submit(record);

        assertThat(record.getAuditGroup()).isEqualTo("TEXT");
        assertThat(record.getStatus()).isEqualTo(AppUserAuditStatusEnum.PENDING.getCode());
        assertThat(record.getAuditSource()).isEqualTo(AuditSourceEnum.MACHINE.getCode());
        assertThat(record.getCurrentEffective()).isZero();
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
    @DisplayName("人工通过非相册审核时同类型旧生效记录下线，新记录生效并写历史")
    void shouldApproveAndReplacePreviousEffectiveRecord() {
        AppUserAuditRecord current = record(2L, 10L, AppUserAuditTypeEnum.EDUCATION, AppUserAuditStatusEnum.PENDING, 0);
        AppUserAuditRecord oldEffective = record(1L, 10L, AppUserAuditTypeEnum.EDUCATION, AppUserAuditStatusEnum.APPROVED, 1);
        when(recordDao.selectById(2L)).thenReturn(current);
        when(recordDao.selectList(any())).thenReturn(List.of(oldEffective));

        auditService.manualAudit(2L, "APPROVE", null, 99L, "admin");

        assertThat(oldEffective.getCurrentEffective()).isZero();
        assertThat(current.getStatus()).isEqualTo(AppUserAuditStatusEnum.APPROVED.getCode());
        assertThat(current.getAuditSource()).isEqualTo(AuditSourceEnum.MANUAL.getCode());
        assertThat(current.getCurrentEffective()).isEqualTo(1);
        assertThat(current.getAuditorId()).isEqualTo(99L);
        verify(recordDao, atLeastOnce()).updateById(oldEffective);
        verify(recordDao, atLeastOnce()).updateById(current);

        ArgumentCaptor<AppUserAuditHistory> historyCaptor = ArgumentCaptor.forClass(AppUserAuditHistory.class);
        verify(historyDao).insert(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getAction()).isEqualTo("MANUAL_APPROVE");
        assertThat(historyCaptor.getValue().getOperatorType()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("系统失效会清除当前有效标记并写入 SYSTEM_EXPIRE 历史")
    void shouldExpireCurrentRecordBySystem() {
        AppUserAuditRecord current = record(3L, 10L, AppUserAuditTypeEnum.VOICE_INTRO, AppUserAuditStatusEnum.APPROVED, 1);
        when(recordDao.selectById(3L)).thenReturn(current);

        auditService.systemExpire(3L, "user deleted voice");

        assertThat(current.getStatus()).isEqualTo(AppUserAuditStatusEnum.EXPIRED.getCode());
        assertThat(current.getCurrentEffective()).isZero();
        assertThat(current.getExpiredReason()).isEqualTo("user deleted voice");
        verify(recordDao).updateById(current);

        ArgumentCaptor<AppUserAuditHistory> historyCaptor = ArgumentCaptor.forClass(AppUserAuditHistory.class);
        verify(historyDao).insert(historyCaptor.capture());
        AppUserAuditHistory history = historyCaptor.getValue();
        assertThat(history.getAction()).isEqualTo("SYSTEM_EXPIRE");
        assertThat(history.getOperatorType()).isEqualTo("SYSTEM");
        assertThat(history.getReason()).isEqualTo("user deleted voice");
    }

    @Test
    @DisplayName("三重认证等级按实名生效、头像最新通过、学历生效计算")
    void shouldCountTripleCertificationWithUnifiedAuditRules() {
        AppUserAuditRecord realName = record(1L, 10L, AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.APPROVED, 1);
        AppUserAuditRecord avatar = record(2L, 10L, AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.APPROVED, 0);
        AppUserAuditRecord education = record(3L, 10L, AppUserAuditTypeEnum.EDUCATION, AppUserAuditStatusEnum.APPROVED, 1);
        when(recordDao.selectOne(any())).thenReturn(realName, avatar, education);

        int count = auditService.certificationApprovedCount(10L);

        assertThat(count).isEqualTo(3);
    }

    private AppUserAuditRecord record(Long id, Long userId, AppUserAuditTypeEnum type,
            AppUserAuditStatusEnum status, Integer currentEffective) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id);
        record.setUserId(userId);
        record.setAuditGroup(type.getGroup());
        record.setAuditType(type.getCode());
        record.setStatus(status.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setCurrentEffective(currentEffective);
        return record;
    }
}

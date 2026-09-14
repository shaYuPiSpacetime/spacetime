package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppUserAuditHistoryDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.service.impl.AppUserAuditServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppUserAuditServiceImplEducationProjectionTest {

    @Mock
    private AppUserAuditRecordDao recordDao;
    @Mock
    private AppUserAuditHistoryDao historyDao;
    @Mock
    private AppUserDao appUserDao;
    @Mock
    private PromotionEventInboxService promotionEventInboxService;

    @Test
    void shouldProjectApprovedEducationSnapshotToAppUser() {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(91L);
        record.setUserId(7L);
        record.setAuditType(AppUserAuditTypeEnum.EDUCATION.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setSchoolName("清华大学");
        record.setSchoolCode("u-tsinghua");
        record.setMaterialJson("{\"educationLevel\":\"BACHELOR\",\"identity\":\"STUDENT\"}");
        when(recordDao.selectById(91L)).thenReturn(record);
        AppUser user = new AppUser();
        user.setId(7L);
        when(appUserDao.selectById(7L)).thenReturn(user);

        AppUserAuditServiceImpl service = new AppUserAuditServiceImpl(
                recordDao, historyDao, appUserDao, promotionEventInboxService, new ObjectMapper());
        service.manualAudit(91L, "APPROVE", null, 3L, "auditor");

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserDao).updateById(captor.capture());
        assertThat(captor.getValue().getSchool()).isEqualTo("清华大学");
        assertThat(captor.getValue().getSchoolCode()).isEqualTo("u-tsinghua");
        assertThat(captor.getValue().getEducationLevel()).isEqualTo("BACHELOR");
        assertThat(captor.getValue().getIdentity()).isEqualTo("STUDENT");
        verify(historyDao).insert(any());
    }
}

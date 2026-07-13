package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.EducationVerificationProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.RealNameVerificationProvider;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;
import com.spacetime.miniapp.service.impl.VerificationServiceImpl;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 移动端三重认证服务测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("移动端三重认证服务")
class VerificationServiceImplTest {

    @Mock
    private AppUserAuditService auditService;
    @Mock
    private AppUserDao appUserDao;
    @Mock
    private ExternalProviderTaskDao externalProviderTaskDao;
    @Mock
    private RealNameVerificationProvider realNameVerificationProvider;
    @Mock
    private EducationVerificationProvider educationVerificationProvider;
    @Mock
    private ProfileDictionaryService profileDictionaryService;

    @InjectMocks
    private VerificationServiceImpl service;

    @Test
    @DisplayName("实名认证使用账号绑定手机号执行三要素机审")
    void shouldSubmitRealNameWithBoundPhone() {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setPhone("13800138000");
        when(appUserDao.selectById(7L)).thenReturn(user);
        AppUserAuditRecord approved = record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.APPROVED);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME)).thenReturn(null, approved);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.EDUCATION)).thenReturn(null);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR)).thenReturn(null);
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(101L);
            return record;
        });
        when(realNameVerificationProvider.check("张三", "110101199001011234", "13800138000"))
                .thenReturn(ProviderCheckResult.safe("mock-real-name", "{\"result\":\"pass\"}", true));
        org.mockito.Mockito.doAnswer(invocation -> {
            ExternalProviderTask task = invocation.getArgument(0);
            task.setId(201L);
            return null;
        }).when(externalProviderTaskDao).insert(any());

        RealNameSubmitReq req = new RealNameSubmitReq();
        req.setRealName("张三");
        req.setIdCardNo("110101199001011234");
        req.setSingleCommitmentChecked(true);

        service.submitRealName(7L, req);

        ArgumentCaptor<AppUserAuditRecord> recordCaptor = ArgumentCaptor.forClass(AppUserAuditRecord.class);
        verify(auditService).submit(recordCaptor.capture());
        assertThat(recordCaptor.getValue().getBoundPhone()).isEqualTo("13800138000");
        assertThat(recordCaptor.getValue().getIdCard()).isEqualTo("110101199001011234");
        verify(realNameVerificationProvider).check("张三", "110101199001011234", "13800138000");
        verify(auditService).machineApprove(101L, 201L, "{\"result\":\"pass\"}");
    }

    @Test
    @DisplayName("实名认证已提审后允许提交学信网学历认证")
    void shouldSubmitChsiEducationAfterRealNameSubmitted() {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setIdentity("EMPLOYEE");
        when(appUserDao.selectById(7L)).thenReturn(user);
        AppUserAuditRecord realNamePending = record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.PENDING);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME))
                .thenReturn(realNamePending, realNamePending);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.EDUCATION)).thenReturn(null, null);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR)).thenReturn(null);
        when(profileDictionaryService.requireCode("app_education_level", "BACHELOR", "学历"))
                .thenReturn("BACHELOR");
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(301L);
            return record;
        });
        when(educationVerificationProvider.check(any(), any(), any()))
                .thenReturn(ProviderCheckResult.safe(
                        "mock-education", "{\"mocked\":true,\"result\":\"pass\"}", true));
        org.mockito.Mockito.doAnswer(invocation -> {
            ExternalProviderTask task = invocation.getArgument(0);
            task.setId(302L);
            return null;
        }).when(externalProviderTaskDao).insert(any());

        EducationSubmitReq req = new EducationSubmitReq();
        req.setEducationUserType("MAINLAND_GRADUATE");
        req.setEducationMethod("CHSI");
        req.setSchoolName("浙江工业大学");
        req.setEducationLevel("BACHELOR");
        req.setChsiCode("123456789012");
        req.setEducationAgreementChecked(true);

        VerificationStatusVO result = service.submitEducation(7L, req);

        ArgumentCaptor<AppUserAuditRecord> recordCaptor = ArgumentCaptor.forClass(AppUserAuditRecord.class);
        verify(auditService).submit(recordCaptor.capture());
        AppUserAuditRecord record = recordCaptor.getValue();
        assertThat(record.getEducationMethod()).isEqualTo("CHSI");
        assertThat(record.getSchoolName()).isEqualTo("浙江工业大学");
        assertThat(record.getMaterialJson()).contains("\"educationUserType\":\"MAINLAND_GRADUATE\"")
                .contains("\"educationLevel\":\"BACHELOR\"")
                .contains("\"chsiCode\":\"123456789012\"");
        verify(educationVerificationProvider).check(
                "CHSI", record.getSchoolName(), record.getMaterialJson());
        verify(auditService).machineApprove(
                301L, 302L, "{\"mocked\":true,\"result\":\"pass\"}");
        assertThat(result.getEducationCanSubmit()).isTrue();
    }

    @Test
    @DisplayName("在校生材料超过4张时拒绝提交")
    void shouldRejectTooManyStudentMaterials() {
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME))
                .thenReturn(record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.REVIEWING));
        EducationSubmitReq req = new EducationSubmitReq();
        req.setEducationUserType("STUDENT");
        req.setEducationMethod("STUDENT_CARD");
        req.setSchoolName("浙江大学");
        req.setEducationLevel("BACHELOR");
        req.setMaterialUrls(List.of("https://a/1.jpg", "https://a/2.jpg", "https://a/3.jpg",
                "https://a/4.jpg", "https://a/5.jpg"));
        req.setEducationAgreementChecked(true);

        assertThatThrownBy(() -> service.submitEducation(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("最多4张");
    }

    @Test
    @DisplayName("三重认证状态返回学历顺序限制和各项提交权限")
    void shouldReturnSubmissionGuards() {
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME)).thenReturn(null);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.EDUCATION)).thenReturn(null);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR))
                .thenReturn(record(AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.REJECTED));

        VerificationStatusVO result = service.getStatus(7L);

        assertThat(result.getRealNameCanSubmit()).isTrue();
        assertThat(result.getAvatarCanSubmit()).isTrue();
        assertThat(result.getEducationCanSubmit()).isFalse();
        assertThat(result.getEducationBlockedReason()).isEqualTo("请先提交实名认证");
    }

    private AppUserAuditRecord record(AppUserAuditTypeEnum type, AppUserAuditStatusEnum status) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setAuditType(type.getCode());
        record.setStatus(status.getCode());
        return record;
    }
}

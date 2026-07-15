package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.constant.ProfileDictType;
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
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.EducationVerifyDetailVO;
import com.spacetime.miniapp.dto.response.RealNameVerifyDetailVO;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;
import com.spacetime.miniapp.service.impl.Prd01AccessEvaluator;
import com.spacetime.miniapp.service.impl.VerificationServiceImpl;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
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
    @Mock
    private Prd01RuntimeConfigResolver runtimeConfigResolver;
    @Mock
    private Prd01AccessEvaluator accessEvaluator;

    @InjectMocks
    private VerificationServiceImpl service;

    private Prd01RuntimeConfigResolver.RuntimeConfigSnapshot defaultConfigSnapshot;

    @BeforeEach
    void setUpRuntimeConfig() {
        defaultConfigSnapshot = new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(java.util.Map.of());
        AppUser defaultUser = new AppUser();
        defaultUser.setId(7L);
        org.mockito.Mockito.lenient().when(appUserDao.selectById(7L)).thenReturn(defaultUser);
        AccessStatusVO accessStatus = new AccessStatusVO();
        accessStatus.setCoreAccessStatus("NON_CORE_ONLY");
        org.mockito.Mockito.lenient().when(accessEvaluator.evaluate(any())).thenReturn(accessStatus);
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.snapshot()).thenReturn(defaultConfigSnapshot);
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.auditPolicy(defaultConfigSnapshot))
                .thenReturn(new Prd01RuntimeConfigResolver.AuditPolicy(24, "学历认证预计24小时内完成"));
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.uploadRule(defaultConfigSnapshot, "education", 4, 10))
                .thenReturn(new Prd01RuntimeConfigResolver.UploadRule(4, 10, List.of("jpg", "jpeg", "png")));
        org.mockito.Mockito.lenient().when(profileDictionaryService.requireCode(
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString()))
                .thenAnswer(invocation -> invocation.getArgument(1));
    }

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
                .contains("\"identity\":\"WORKER\"")
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
    @DisplayName("学历材料数量使用后台上传限制配置")
    void shouldRejectMaterialsAboveConfiguredLimit() {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot =
                new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(java.util.Map.of());
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        org.mockito.Mockito.lenient().when(runtimeConfigResolver.uploadRule(snapshot, "education", 4, 10))
                .thenReturn(new Prd01RuntimeConfigResolver.UploadRule(2, 10, List.of("jpg", "jpeg", "png")));
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME))
                .thenReturn(record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.REVIEWING));

        EducationSubmitReq req = new EducationSubmitReq();
        req.setEducationUserType("STUDENT");
        req.setEducationMethod("STUDENT_CARD");
        req.setSchoolName("浙江大学");
        req.setEducationLevel("BACHELOR");
        req.setMaterialUrls(List.of("https://a/1.jpg", "https://a/2.jpg", "https://a/3.jpg"));
        req.setEducationAgreementChecked(true);

        assertThatThrownBy(() -> service.submitEducation(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("最多2张");
    }

    @Test
    @DisplayName("学历材料接受前端直传后返回的受保护凭证相对路径")
    void shouldAcceptProtectedEducationCredentialPath() {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setIdentity("STUDENT");
        when(appUserDao.selectById(7L)).thenReturn(user);
        AppUserAuditRecord realName = record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.APPROVED);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME)).thenReturn(realName, realName);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.EDUCATION)).thenReturn(null, null);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR)).thenReturn(null);
        when(profileDictionaryService.requireCode(ProfileDictType.EDUCATION_LEVEL, "BACHELOR", "学历"))
                .thenReturn("BACHELOR");
        when(auditService.submit(any())).thenAnswer(invocation -> {
            AppUserAuditRecord record = invocation.getArgument(0);
            record.setId(501L);
            return record;
        });
        when(educationVerificationProvider.check(any(), any(), any()))
                .thenReturn(ProviderCheckResult.safe("mock-education", "{}", true));

        EducationSubmitReq req = studentEducationReq(
                "/miniapp/file/credential/user-7/20260714/education-proof.jpg");

        assertThatCode(() -> service.submitEducation(7L, req)).doesNotThrowAnyException();

        ArgumentCaptor<AppUserAuditRecord> captor = ArgumentCaptor.forClass(AppUserAuditRecord.class);
        verify(auditService).submit(captor.capture());
        assertThat(captor.getValue().getMaterialJson())
                .contains("/miniapp/file/credential/user-7/20260714/education-proof.jpg");
    }

    @Test
    @DisplayName("学历人群字典停用时拒绝提交")
    void shouldRejectEducationUserTypeDisabledByDictionary() {
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME))
                .thenReturn(record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.APPROVED));
        when(profileDictionaryService.requireCode(ProfileDictType.EDUCATION_USER_TYPE, "STUDENT", "学历人群"))
                .thenThrow(new BusinessException("学历人群编码不存在或已停用"));
        EducationSubmitReq req = studentEducationReq("https://static.example.com/student-card.jpg");

        assertThatThrownBy(() -> service.submitEducation(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("学历人群编码不存在或已停用");
        verify(auditService, org.mockito.Mockito.never()).submit(any());
    }

    @Test
    @DisplayName("学历认证方式字典停用时拒绝提交")
    void shouldRejectEducationMethodDisabledByDictionary() {
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME))
                .thenReturn(record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.APPROVED));
        when(profileDictionaryService.requireCode(ProfileDictType.EDUCATION_METHOD, "STUDENT_CARD", "学历认证方式"))
                .thenThrow(new BusinessException("学历认证方式编码不存在或已停用"));
        EducationSubmitReq req = studentEducationReq("https://static.example.com/student-card.jpg");

        assertThatThrownBy(() -> service.submitEducation(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessage("学历认证方式编码不存在或已停用");
        verify(auditService, org.mockito.Mockito.never()).submit(any());
    }

    @Test
    @DisplayName("学历材料拒绝非凭证接口的相对路径")
    void shouldRejectNonCredentialRelativeEducationPath() {
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME))
                .thenReturn(record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.APPROVED));
        EducationSubmitReq req = studentEducationReq("/miniapp/file/public/2026/07/14/proof.jpg");

        assertThatThrownBy(() -> service.submitEducation(7L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("材料地址无效");
        verify(auditService, org.mockito.Mockito.never()).submit(any());
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

    @Test
    @DisplayName("三重认证状态返回学历审核SLA和预计完成时间")
    void shouldReturnEducationSlaFromConfiguration() {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot =
                new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(java.util.Map.of());
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.auditPolicy(snapshot))
                .thenReturn(new Prd01RuntimeConfigResolver.AuditPolicy(36, "学历认证预计36小时内完成"));
        AppUserAuditRecord education = record(AppUserAuditTypeEnum.EDUCATION, AppUserAuditStatusEnum.PENDING);
        education.setSubmitTime(LocalDateTime.of(2026, 7, 13, 10, 0));
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME)).thenReturn(null);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.EDUCATION)).thenReturn(education);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.AVATAR)).thenReturn(null);

        VerificationStatusVO result = service.getStatus(7L);

        assertThat(result).extracting(
                        "educationSlaHours", "educationSlaText", "educationEstimatedCompleteTime")
                .containsExactly(36, "学历认证预计36小时内完成", "2026-07-14 22:00:00");
    }

    @Test
    @DisplayName("学历详情回显最新提交内容并按学历人群派生身份字典")
    void shouldReturnEducationDetailWithMappedIdentity() {
        AppUserAuditRecord education = record(AppUserAuditTypeEnum.EDUCATION, AppUserAuditStatusEnum.REJECTED);
        education.setAuditSource("MANUAL");
        education.setEducationMethod("STUDENT_CARD");
        education.setSchoolName("浙江大学");
        education.setRealName("林晓雨");
        education.setRejectReason("学生证照片不清晰");
        education.setSubmitTime(LocalDateTime.of(2026, 7, 13, 18, 4, 16));
        education.setMaterialJson("""
                {"educationUserType":"STUDENT","educationLevel":"BACHELOR","identity":"STUDENT","materialUrls":["https://example.test/student-a.jpg","https://example.test/student-b.jpg"]}
                """);
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME))
                .thenReturn(record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.APPROVED));
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.EDUCATION)).thenReturn(education);
        when(profileDictionaryService.label(ProfileDictType.IDENTITY, "STUDENT")).thenReturn("在校生");
        when(profileDictionaryService.label(ProfileDictType.EDUCATION_LEVEL, "BACHELOR")).thenReturn("本科");

        EducationVerifyDetailVO result = service.getEducationDetail(7L);

        assertThat(result.getAuditStatus()).isEqualTo("REJECTED");
        assertThat(result.getRejectReason()).isEqualTo("学生证照片不清晰");
        assertThat(result.getEducationUserType()).isEqualTo("STUDENT");
        assertThat(result.getIdentityCode()).isEqualTo("STUDENT");
        assertThat(result.getIdentityLabel()).isEqualTo("在校生");
        assertThat(result.getEducationLevelLabel()).isEqualTo("本科");
        assertThat(result.getMaterialUrls()).containsExactly(
                "https://example.test/student-a.jpg", "https://example.test/student-b.jpg");
        assertThat(result.getCanSubmit()).isTrue();
    }

    @Test
    @DisplayName("实名详情只回显脱敏姓名和身份证号")
    void shouldReturnMaskedRealNameDetail() {
        AppUserAuditRecord realName = record(AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.PENDING);
        realName.setAuditSource("MACHINE");
        realName.setRealName("王小明");
        realName.setIdCard("110101199001011234");
        realName.setBoundPhone("13800138000");
        realName.setSubmitTime(LocalDateTime.of(2026, 7, 13, 18, 4, 16));
        when(auditService.latestRecord(7L, AppUserAuditTypeEnum.REAL_NAME)).thenReturn(realName);

        RealNameVerifyDetailVO result = service.getRealNameDetail(7L);

        assertThat(result.getAuditStatus()).isEqualTo("PENDING");
        assertThat(result.getRealName()).isEqualTo("王**");
        assertThat(result.getIdCardNo()).isEqualTo("1101**********1234");
        assertThat(result.getCanSubmit()).isFalse();
    }

    private AppUserAuditRecord record(AppUserAuditTypeEnum type, AppUserAuditStatusEnum status) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setAuditType(type.getCode());
        record.setStatus(status.getCode());
        return record;
    }

    private EducationSubmitReq studentEducationReq(String materialUrl) {
        EducationSubmitReq req = new EducationSubmitReq();
        req.setEducationUserType("STUDENT");
        req.setEducationMethod("STUDENT_CARD");
        req.setSchoolName("浙江大学");
        req.setEducationLevel("BACHELOR");
        req.setMaterialUrls(List.of(materialUrl));
        req.setEducationAgreementChecked(true);
        return req;
    }
}

package com.spacetime.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.request.DeleteAppUserReq;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.AppUserWorkflowHistoryVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.ImportBatchVO;
import com.spacetime.admin.dto.response.AppUserStatsVO;
import com.spacetime.admin.service.impl.AppUserAdminServiceImpl;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserExportTaskDao;
import com.spacetime.common.dao.AppUserImportBatchDao;
import com.spacetime.common.dao.AppUserImportRowDao;
import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.AppUserCleanupDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.AppUserExportTask;
import com.spacetime.common.entity.AppUserImportBatch;
import com.spacetime.common.entity.AppUserImportRow;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.Prd01ProfileCompletenessCalculator;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.MiniappTokenSessionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.apache.ibatis.builder.MapperBuilderAssistant;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
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
    private AppRelationVisitEventDao visitEventDao;
    @Mock
    private AppUserAuditRecordDao auditRecordDao;
    @Mock
    private AppUserExportTaskDao exportTaskDao;
    @Mock
    private AppUserImportBatchDao importBatchDao;
    @Mock
    private AppUserImportRowDao importRowDao;
    @Mock
    private ContentOperationLogDao contentOperationLogDao;
    @Mock
    private AppUserCleanupDao appUserCleanupDao;
    @Mock
    private UserAssetDao userAssetDao;
    @Mock
    private ProfileDictionaryService profileDictionaryService;
    @Mock
    private AppUserAuditContentService auditContentService;
    @Mock
    private Prd01ProfileCompletenessCalculator profileCompletenessCalculator;
    @Mock
    private Prd01RuntimeConfigResolver runtimeConfigResolver;
    @Mock
    private RelationAccessProjectionService relationAccessProjectionService;
    @Mock
    private MiniappTokenSessionService miniappTokenSessionService;

    @InjectMocks
    private AppUserAdminServiceImpl service;

    @Test
    @DisplayName("彻底删除用户应清理数据库、撤销会话并写入脱敏审计")
    void shouldHardDeleteUserAndWriteSanitizedAudit() {
        AppUser user = user(88L, "待删除用户");
        user.setPhone("17366629764");
        user.setOpenid("sensitive-openid");
        user.setUnionid("sensitive-unionid");
        when(appUserDao.selectById(88L)).thenReturn(user);
        DeleteAppUserReq req = deleteReq("重复测试完整准入流程");

        service.deleteUser(88L, req);

        verify(appUserCleanupDao).deleteByUserId(88L);
        verify(miniappTokenSessionService).revokeAllByUserId(88L);
        ArgumentCaptor<com.spacetime.common.entity.ContentOperationLog> logCaptor =
                ArgumentCaptor.forClass(com.spacetime.common.entity.ContentOperationLog.class);
        verify(contentOperationLogDao).insert(logCaptor.capture());
        com.spacetime.common.entity.ContentOperationLog log = logCaptor.getValue();
        assertThat(log.getBizType()).isEqualTo("APP_USER");
        assertThat(log.getBizId()).isEqualTo(88L);
        assertThat(log.getAction()).isEqualTo("HARD_DELETE");
        assertThat(log.getBeforeValue())
                .contains("173****9764")
                .doesNotContain("17366629764", "sensitive-openid", "sensitive-unionid");
        assertThat(log.getAfterValue()).contains("\"deleted\":true", "\"sessionRevoked\":true");
        assertThat(log.getRemark()).isEqualTo("重复测试完整准入流程");
    }

    @Test
    @DisplayName("彻底删除用户的原因去除空格后不得为空")
    void shouldRejectBlankHardDeleteReason() {
        DeleteAppUserReq req = deleteReq("  ");

        assertThatThrownBy(() -> service.deleteUser(88L, req))
                .isInstanceOf(com.spacetime.common.exception.BusinessException.class)
                .hasMessage("删除原因不能为空");
        verifyNoInteractions(appUserCleanupDao, miniappTokenSessionService, contentOperationLogDao);
    }

    @Test
    @DisplayName("数据库清理失败后不得撤销会话或写成功审计")
    void shouldStopWhenHardDeleteCleanupFails() {
        AppUser user = user(88L, "待删除用户");
        when(appUserDao.selectById(88L)).thenReturn(user);
        org.mockito.Mockito.doThrow(new RuntimeException("cleanup failed"))
                .when(appUserCleanupDao).deleteByUserId(88L);

        assertThatThrownBy(() -> service.deleteUser(88L, deleteReq("测试重置")))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("cleanup failed");
        verifyNoInteractions(miniappTokenSessionService, contentOperationLogDao);
    }

    @Test
    @DisplayName("登录态清理失败后不得写入删除成功审计")
    void shouldRollbackWhenSessionRevocationFails() {
        AppUser user = user(88L, "待删除用户");
        when(appUserDao.selectById(88L)).thenReturn(user);
        org.mockito.Mockito.doThrow(new com.spacetime.common.exception.BusinessException("用户登录态清理失败，请稍后重试"))
                .when(miniappTokenSessionService).revokeAllByUserId(88L);

        assertThatThrownBy(() -> service.deleteUser(88L, deleteReq("测试重置")))
                .isInstanceOf(com.spacetime.common.exception.BusinessException.class)
                .hasMessage("用户登录态清理失败，请稍后重试");
        verify(appUserCleanupDao).deleteByUserId(88L);
        verifyNoInteractions(contentOperationLogDao);
    }

    private DeleteAppUserReq deleteReq(String reason) {
        DeleteAppUserReq req = new DeleteAppUserReq();
        req.setReason(reason);
        return req;
    }

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
        AppUserAuditRecord realNamePending = audit(105L, 1L, AppUserAuditTypeEnum.REAL_NAME,
                AppUserAuditStatusEnum.PENDING, null, 5);
        AppUserAuditRecord realNameApproved = audit(104L, 1L, AppUserAuditTypeEnum.REAL_NAME,
                AppUserAuditStatusEnum.APPROVED, null, 4);
        AppUserAuditRecord educationPending = audit(107L, 1L, AppUserAuditTypeEnum.EDUCATION,
                AppUserAuditStatusEnum.PENDING, null, 7);
        AppUserAuditRecord educationApproved = audit(106L, 1L, AppUserAuditTypeEnum.EDUCATION,
                AppUserAuditStatusEnum.APPROVED, null, 6);
        when(auditRecordDao.selectList(any())).thenReturn(List.of(
                avatar, realNamePending, realNameApproved, educationPending, educationApproved,
                albumNew, albumOld));
        UserAsset asset = new UserAsset();
        asset.setUserId(1L);
        asset.setCoinBalance(1280);
        asset.setVipStatus("active");
        Page<UserAsset> assetPage = new Page<>(1, 2, 1);
        assetPage.setRecords(List.of(asset));
        when(userAssetDao.selectPage(any(), any())).thenReturn(assetPage);
        when(profileDictionaryService.labels(any(), anyCollection())).thenReturn(Map.of(
                "MALE", "男",
                "WORKER", "职场人",
                "IT", "IT/互联网",
                "PM", "产品经理",
                "INC_30_50", "30-50万",
                "BACHELOR", "本科",
                "330000", "浙江省",
                "330100", "杭州市"));
        first.setGender("MALE");
        first.setIdentity("WORKER");
        first.setIndustry("IT");
        first.setOccupation("PM");
        first.setCompany("星河科技");
        first.setAnnualIncome("INC_30_50");
        first.setEducationLevel("BACHELOR");
        first.setLocationProvince("330000");
        first.setLocationCity("330100");
        first.setWechatId("wx_seed_01");

        Prd01ProfileCompletenessCalculator.ProfileCompletenessRules rules =
                new Prd01ProfileCompletenessCalculator.ProfileCompletenessRules(Map.of());
        when(profileCompletenessCalculator.loadRules()).thenReturn(rules);
        when(profileCompletenessCalculator.calculate(any(AppUser.class), same(rules), anyMap(), anySet(), anySet()))
                .thenReturn(88);
        when(relationAccessProjectionService.project(any(AppUser.class), anyBoolean(), anyInt(), anyInt()))
                .thenReturn("CLOSED");

        AppUserPageReq req = new AppUserPageReq();
        req.setPage(1);
        req.setSize(9);
        Page<com.spacetime.admin.dto.response.AppUserListVO> result = service.getUserPage(req);

        assertThat(result.getRecords()).hasSize(2);
        assertThat(result.getRecords().get(0).getAvatar()).isEqualTo("https://oss.example.com/avatar-1.jpg");
        assertThat(result.getRecords().get(0).getPhotos())
                .isEqualTo("[\"https://oss.example.com/album-1.jpg\",\"https://oss.example.com/album-2.jpg\"]");
        assertThat(result.getRecords().get(0).getAvatarVerifyStatus()).isEqualTo("APPROVED");
        assertThat(result.getRecords().get(0))
                .extracting("genderLabel", "identityLabel", "industryLabel", "occupationLabel",
                        "company", "annualIncomeLabel", "educationLevelLabel", "city",
                        "wechatId", "avatarAuditRecordId", "avatarAuditMediaUrl")
                .containsExactly("男", "职场人", "IT/互联网", "产品经理",
                        "星河科技", "30-50万", "本科", "浙江省杭州市",
                        "wx_****01", 101L, "https://oss.example.com/avatar-1.jpg");
        assertThat(result.getRecords().get(0).getProfileScore()).isEqualTo(88);
        assertThat(result.getRecords().get(1).getAvatarVerifyStatus()).isEqualTo("NOT_SUBMITTED");
        assertThat(result.getRecords()).allMatch(item -> "CLOSED".equals(item.getRelationshipAccess()));

        verify(auditRecordDao, times(1)).selectList(any());
        verify(profileCompletenessCalculator, times(1)).loadRules();
        verify(profileCompletenessCalculator, times(2))
                .calculate(any(AppUser.class), same(rules), anyMap(), anySet(), anySet());
        verify(profileCompletenessCalculator, never()).calculate(any(AppUser.class));
        ArgumentCaptor<Boolean> tripleApprovedCaptor = ArgumentCaptor.forClass(Boolean.class);
        verify(relationAccessProjectionService, times(2))
                .project(any(AppUser.class), tripleApprovedCaptor.capture(), anyInt(), anyInt());
        assertThat(tripleApprovedCaptor.getAllValues()).containsExactly(true, false);
        verify(profileDictionaryService, never()).labels(ProfileDictType.CHINA_REGION);
        verify(profileDictionaryService).labels(eq(ProfileDictType.CHINA_REGION), anyCollection());
        verifyNoInteractions(auditContentService);
    }

    @Test
    @DisplayName("用户列表查询条件应全部落入后端筛选")
    void shouldApplyAllUserPageFilters() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), AppUser.class);
        Page<AppUser> page = new Page<>(1, 9, 0);
        page.setRecords(List.of());
        when(appUserDao.selectPage(any(), any())).thenReturn(page);

        AppUserPageReq req = new AppUserPageReq();
        req.setPage(1);
        req.setSize(9);
        req.setIdentity("WORKER");
        req.setCity("330100");
        req.setRelationshipAccess("OPEN");
        req.setVipStatus("active");
        stubAccessAgePolicy(18, 60);

        service.getUserPage(req);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<LambdaQueryWrapper<AppUser>> captor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(appUserDao).selectPage(any(), captor.capture());
        String sql = captor.getValue().getSqlSegment();
        assertThat(sql)
                .contains("identity")
                .contains("location_city")
                .contains("first_login_completed")
                .contains("app_user_asset")
                .contains("vip_status");
    }

    @Test
    @DisplayName("普通会员筛选不应包含会员过期用户")
    void shouldFilterInactiveVipWithoutExpiredMembers() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), AppUser.class);
        Page<AppUser> page = new Page<>(1, 9, 0);
        page.setRecords(List.of());
        when(appUserDao.selectPage(any(), any())).thenReturn(page);

        AppUserPageReq req = new AppUserPageReq();
        req.setPage(1);
        req.setSize(9);
        req.setVipStatus("inactive");

        service.getUserPage(req);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<LambdaQueryWrapper<AppUser>> captor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(appUserDao).selectPage(any(), captor.capture());
        String sql = captor.getValue().getSqlSegment();
        assertThat(sql)
                .contains("NOT EXISTS")
                .contains("vip_status = 'inactive'")
                .doesNotContain("vip_status = 'active'");
    }

    @Test
    @DisplayName("关系反馈准入开放筛选应关联准入年龄配置")
    void shouldApplyAgePolicyWhenFilteringRelationshipOpen() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), AppUser.class);
        Page<AppUser> page = new Page<>(1, 9, 0);
        page.setRecords(List.of());
        when(appUserDao.selectPage(any(), any())).thenReturn(page);
        stubAccessAgePolicy(20, 45);

        AppUserPageReq req = new AppUserPageReq();
        req.setPage(1);
        req.setSize(9);
        req.setRelationshipAccess("OPEN");

        service.getUserPage(req);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<LambdaQueryWrapper<AppUser>> captor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(appUserDao).selectPage(any(), captor.capture());
        String sql = captor.getValue().getSqlSegment();
        assertThat(sql)
                .contains("TIMESTAMPDIFF(YEAR, birthday, CURDATE()) BETWEEN 20 AND 45")
                .contains("age BETWEEN 20 AND 45");
    }

    @Test
    @DisplayName("用户统计返回当前用户、核心准入、关系开放和七日访客 UV")
    void shouldReturnAppUserStatsFromCountQueries() {
        when(appUserDao.count(any())).thenReturn(63L, 41L, 37L);
        when(visitEventDao.countDistinctVisitorsSince(any())).thenReturn(28L);
        LocalDateTime earliestStart = LocalDateTime.now().minusDays(7);

        AppUserStatsVO stats = service.getUserStats();
        LocalDateTime latestStart = LocalDateTime.now().minusDays(7);

        assertThat(stats.getCurrentUserCount()).isEqualTo(63L);
        assertThat(stats.getCoreAccessAllowedCount()).isEqualTo(41L);
        assertThat(stats.getRelationshipAccessOpenCount()).isEqualTo(37L);
        assertThat(stats.getVisitorUv7d()).isEqualTo(28L);
        verify(appUserDao, times(3)).count(any());
        ArgumentCaptor<LocalDateTime> startTimeCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(visitEventDao).countDistinctVisitorsSince(startTimeCaptor.capture());
        assertThat(startTimeCaptor.getValue()).isBetween(earliestStart, latestStart);
        verifyNoInteractions(auditRecordDao, auditContentService, profileCompletenessCalculator,
                profileDictionaryService);
    }

    @Test
    @DisplayName("导入预校验应支持用户全字段和图片资料 URL")
    void shouldPreviewImportAllSupportedFieldsAndMediaUrls() {
        mockImportRequiredFields(List.of(
                fieldSetting("phone", "手机号", true, true),
                fieldSetting("nickname", "昵称", true, false),
                fieldSetting("gender", "性别", true, false)));
        String csv = String.join("\n",
                "phone,nickname,gender,birthday,identity,educationLevel,locationProvince,locationCity,"
                        + "locationDistrict,avatarUrl,albumPhotoUrls,profileBgImageUrl,voiceIntroUrl,"
                        + "aboutMe,tags,wechatId",
                "13800000001,导入用户,MALE,1997-03-06,WORKER,BACHELOR,330000,330100,330106,"
                        + "https://img.example.com/avatar.jpg,https://img.example.com/a.jpg|https://img.example.com/b.jpg,"
                        + "https://img.example.com/bg.jpg,https://audio.example.com/voice.mp3,"
                        + "自我介绍,IT女神|户外发烧友,wx_import_01");

        ImportBatchVO result = service.previewImport("app-users.csv", csv);

        assertThat(result.getSuccessCount()).isEqualTo(1);
        ArgumentCaptor<AppUserImportRow> rowCaptor = ArgumentCaptor.forClass(AppUserImportRow.class);
        verify(importRowDao).insert(rowCaptor.capture());
        assertThat(rowCaptor.getValue().getRawJson())
                .contains("\"avatarUrl\":\"https://img.example.com/avatar.jpg\"")
                .contains("\"albumPhotoUrls\":\"https://img.example.com/a.jpg|https://img.example.com/b.jpg\"")
                .contains("\"profileBgImageUrl\":\"https://img.example.com/bg.jpg\"")
                .contains("\"voiceIntroUrl\":\"https://audio.example.com/voice.mp3\"")
                .contains("\"wechatId\":\"wx_import_01\"");
    }

    @Test
    @DisplayName("import should mirror config field aliases")
    void shouldMirrorImportConfigFieldAliases() {
        mockImportRequiredFields(List.of(
                fieldSetting("identityType", "identityType", true, true),
                fieldSetting("idCardNo", "idCardNo", true, true)));
        String csv = String.join("\n",
                "phone,identity,idCard",
                "13800000003,WORKER,330106199703060011");

        ImportBatchVO result = service.previewImport("app-users.csv", csv);

        assertThat(result.getSuccessCount()).isEqualTo(1);
        ArgumentCaptor<AppUserImportRow> rowCaptor = ArgumentCaptor.forClass(AppUserImportRow.class);
        verify(importRowDao).insert(rowCaptor.capture());
        assertThat(rowCaptor.getValue().getRawJson())
                .contains("\"identityType\":\"WORKER\"")
                .contains("\"idCardNo\":\"330106199703060011\"");
    }

    @Test
    @DisplayName("import required validation should follow profile field config")
    void shouldValidateImportRequiredFieldsFromProfileConfig() {
        mockImportRequiredFields(List.of(
                fieldSetting("phone", "手机号", true, true),
                fieldSetting("nickname", "昵称", true, false),
                fieldSetting("gender", "性别", true, true)));
        String csv = String.join("\n",
                "phone,nickname,gender",
                "13800000001,,MALE",
                "13800000002,缺性别,");

        ImportBatchVO result = service.previewImport("app-users.csv", csv);

        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getFailCount()).isEqualTo(1);
        assertThat(result.getErrorSummaryJson())
                .contains("性别不能为空")
                .doesNotContain("昵称不能为空");
        verify(runtimeConfigResolver).fieldSettings(any());
    }

    @Test
    @DisplayName("导入成功行应真实写入 app_user 并把中文枚举转为字典 code")
    void shouldImportValidRowsIntoAppUserWithChineseDictValues() {
        mockImportRequiredFields(List.of(
                fieldSetting("phone", "手机号", true, true),
                fieldSetting("nickname", "昵称", true, true),
                fieldSetting("gender", "性别", true, true)));
        mockProfileDictLabels();
        String csv = String.join("\n",
                "phone,nickname,gender,identityType,educationLevel,locationProvince,locationCity,avatarImage,photos,profileBgImage,aboutMe,realName,idCardNo",
                "13900001111,导入真实用户,女,职场人,本科,浙江省,杭州市,https://img.test/avatar.jpg,https://img.test/album-a.jpg|https://img.test/album-b.jpg,https://img.test/bg.jpg,真诚生活,张三,330106199703060011");

        ImportBatchVO result = service.previewImport("app-users.csv", csv);

        assertThat(result.getStatus()).isEqualTo("IMPORTED");
        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getImportedCount()).isEqualTo(1);
        ArgumentCaptor<AppUser> userCaptor = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserDao).insert(userCaptor.capture());
        AppUser imported = userCaptor.getValue();
        assertThat(imported.getPhone()).isEqualTo("13900001111");
        assertThat(imported.getNickname()).isEqualTo("导入真实用户");
        assertThat(imported.getGender()).isEqualTo("FEMALE");
        assertThat(imported.getIdentity()).isEqualTo("WORKER");
        assertThat(imported.getEducationLevel()).isEqualTo("BACHELOR");
        assertThat(imported.getLocationProvince()).isEqualTo("330000");
        assertThat(imported.getLocationCity()).isEqualTo("330100");
        ArgumentCaptor<AppUserAuditRecord> auditCaptor = ArgumentCaptor.forClass(AppUserAuditRecord.class);
        verify(auditRecordDao, times(6)).insert(auditCaptor.capture());
        assertThat(auditCaptor.getAllValues().stream().map(AppUserAuditRecord::getAuditType))
                .contains(AppUserAuditTypeEnum.AVATAR.getCode())
                .contains(AppUserAuditTypeEnum.ALBUM_PHOTO.getCode())
                .contains(AppUserAuditTypeEnum.PROFILE_BG.getCode())
                .contains(AppUserAuditTypeEnum.REAL_NAME.getCode());
    }

    @Test
    @DisplayName("导入模板中文列头应能映射到配置必填字段")
    void shouldImportChineseTemplateHeadersForConfiguredRequiredFields() {
        mockImportRequiredFields(List.of(
                fieldSetting("loginMethod", "登录方式", true, true),
                fieldSetting("phone", "手机号", true, true),
                fieldSetting("smsCode", "短信验证码", true, true),
                fieldSetting("wechatAuth", "微信授权信息", true, true),
                fieldSetting("agreementAccepted", "登录协议/隐私协议同意", true, true)));
        String csv = String.join("\n",
                "登录方式,手机号,短信验证码,微信授权信息,登录协议/隐私协议同意",
                "PHONE,13900003333,123456,WECHAT_AUTH_OK,true");

        ImportBatchVO result = service.previewImport("app-users.csv", csv);

        assertThat(result.getStatus()).isEqualTo("IMPORTED");
        assertThat(result.getImportedCount()).isEqualTo(1);
        assertThat(result.getErrorSummaryJson()).isEqualTo("[]");
        ArgumentCaptor<AppUser> userCaptor = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserDao).insert(userCaptor.capture());
        assertThat(userCaptor.getValue().getPhone()).isEqualTo("13900003333");
    }

    @Test
    @DisplayName("导出应按 App 用户全字段和图片 URL 口径创建任务")
    void shouldCreateAllFieldExportTask() {
        AppUserPageReq req = new AppUserPageReq();
        req.setKeyword("ken");
        req.setIdentity("student");
        req.setCity("330100");
        req.setRelationshipAccess("OPEN");
        req.setVipStatus("active");
        AppUser user = user(99L, "导出用户");
        user.setOpenid("openid_99");
        user.setUnionid("unionid_99");
        user.setGender("FEMALE");
        user.setIdentity("WORKER");
        user.setEducationLevel("BACHELOR");
        user.setLocationProvince("330000");
        user.setLocationCity("330100");
        user.setHometownProvince("410000");
        user.setHometownCity("410100");
        user.setHometownDistrict("410102");
        user.setRegisterSource("ADMIN_IMPORT");
        user.setPhone("13900002222");
        when(appUserDao.selectList(any())).thenReturn(List.of(user));
        when(auditRecordDao.selectList(any())).thenReturn(List.of(
                audit(11L, 99L, AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.PENDING, "https://img.test/avatar.jpg", 1),
                audit(12L, 99L, AppUserAuditTypeEnum.ALBUM_PHOTO, AppUserAuditStatusEnum.PENDING, "https://img.test/album-a.jpg", 2),
                audit(13L, 99L, AppUserAuditTypeEnum.PROFILE_BG, AppUserAuditStatusEnum.PENDING, "https://img.test/bg.jpg", 3),
                audit(14L, 99L, AppUserAuditTypeEnum.REAL_NAME, AppUserAuditStatusEnum.PENDING, null, 4)));
        mockProfileDictLabels();

        ExportTaskVO result = service.exportFixedFields(req, true);

        assertThat(result.getExportType()).isEqualTo("APP_USER_ALL_FIELDS");
        assertThat(result.getMessage()).contains("当前筛选结果").contains("全部用户字段").contains("图片资料输出 URL");
        assertThat(result.getRowCount()).isEqualTo(1);
        assertThat(result.getFileName()).endsWith(".csv");
        assertThat(result.getDownloadContent())
                .contains("导出用户")
                .contains("女")
                .contains("职场人")
                .contains("本科")
                .contains("openid_99")
                .contains("unionid_99")
                .contains("后台导入")
                .contains("河南省")
                .contains("郑州市")
                .contains("中原区")
                .contains("头像URL")
                .contains("相册照片URL")
                .contains("资料背景图URL")
                .contains("实名认证状态")
                .contains("https://img.test/avatar.jpg")
                .contains("https://img.test/album-a.jpg")
                .contains("https://img.test/bg.jpg")
                .doesNotContain("ADMIN_IMPORT")
                .doesNotContain("410000")
                .doesNotContain("410100")
                .doesNotContain("410102")
                .doesNotContain("FEMALE")
                .doesNotContain("WORKER");
        assertThat(result.getFilterSummary())
                .contains("用户搜索=ken")
                .contains("身份=student")
                .contains("城市=330100")
                .contains("关系反馈准入=OPEN")
                .contains("VIP状态=active");
    }

    @Test
    @DisplayName("导入导出历史应合并历史记录并分页返回")
    void shouldReturnWorkflowHistoryFromImportAndExportRecords() {
        AppUserImportBatch importBatch = new AppUserImportBatch();
        importBatch.setId(10L);
        importBatch.setBatchNo("APP-IMPORT-001");
        importBatch.setFileName("users.csv");
        importBatch.setTotalCount(20);
        importBatch.setSuccessCount(18);
        importBatch.setFailCount(2);
        importBatch.setStatus("PARTIAL_IMPORTED");
        importBatch.setCreateTime(LocalDateTime.of(2026, 7, 17, 10, 0));
        Page<AppUserImportBatch> importPage = new Page<>(1, 5, 1);
        importPage.setRecords(List.of(importBatch));

        AppUserExportTask exportTask = new AppUserExportTask();
        exportTask.setId(20L);
        exportTask.setTaskNo("APP-USER-EXPORT-001");
        exportTask.setExportType("APP_USER_ALL_FIELDS");
        exportTask.setStatus("CREATED");
        exportTask.setFileName("app-users.csv");
        exportTask.setRowCount(8);
        exportTask.setDownloadContent("用户ID,昵称\n1,ken");
        exportTask.setCreateTime(LocalDateTime.of(2026, 7, 17, 11, 0));
        Page<AppUserExportTask> exportPage = new Page<>(1, 5, 1);
        exportPage.setRecords(List.of(exportTask));
        when(importBatchDao.selectPage(any(), any())).thenReturn(importPage);
        when(exportTaskDao.selectPage(any(), any())).thenReturn(exportPage);

        Page<AppUserWorkflowHistoryVO> result = service.getWorkflowHistory(1, 5);

        assertThat(result.getTotal()).isEqualTo(2);
        assertThat(result.getRecords()).hasSize(2);
        assertThat(result.getRecords().get(0).getType()).isEqualTo("export");
        assertThat(result.getRecords().get(0).getExportResult().getTaskNo()).isEqualTo("APP-USER-EXPORT-001");
        assertThat(result.getRecords().get(1).getType()).isEqualTo("import");
        assertThat(result.getRecords().get(1).getImportResult().getBatchNo()).isEqualTo("APP-IMPORT-001");
        assertThat(result.getRecords().get(1).getImportResult().getImportedUserIds()).isNull();
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

    private void mockImportRequiredFields(List<Map<String, Object>> settings) {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot =
                new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.fieldSettings(snapshot)).thenReturn(settings);
    }

    private void stubAccessAgePolicy(int minAge, int maxAge) {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot =
                new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        when(runtimeConfigResolver.snapshot()).thenReturn(snapshot);
        when(runtimeConfigResolver.accessPolicy(snapshot)).thenReturn(Map.of(
                "minAge", minAge,
                "maxAge", maxAge));
    }

    private Map<String, Object> fieldSetting(String fieldId, String label, boolean visible, boolean required) {
        return Map.of(
                "fieldId", fieldId,
                "label", label,
                "visible", visible,
                "required", required);
    }

    private void mockProfileDictLabels() {
        lenient().when(profileDictionaryService.labels(ProfileDictType.GENDER)).thenReturn(Map.of("FEMALE", "女", "MALE", "男"));
        lenient().when(profileDictionaryService.labels(ProfileDictType.IDENTITY)).thenReturn(Map.of("WORKER", "职场人", "STUDENT", "在校生"));
        lenient().when(profileDictionaryService.labels(ProfileDictType.EDUCATION_LEVEL)).thenReturn(Map.of("BACHELOR", "本科"));
        lenient().when(profileDictionaryService.labels(ProfileDictType.INDUSTRY)).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(ProfileDictType.OCCUPATION)).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(ProfileDictType.ANNUAL_INCOME)).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(ProfileDictType.MARITAL_STATUS)).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(ProfileDictType.DATING_GOAL)).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(ProfileDictType.EMOTIONAL_STATUS)).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(ProfileDictType.PROFILE_TAG)).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(ProfileDictType.EDUCATION_METHOD)).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(ProfileDictType.CHINA_REGION)).thenReturn(Map.of("330000", "浙江省", "330100", "杭州市"));
        lenient().when(profileDictionaryService.labels(ProfileDictType.CHINA_REGION, Set.of("410000", "410100", "410102")))
                .thenReturn(Map.of("410000", "河南省", "410100", "郑州市", "410102", "中原区"));
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.GENDER), anyCollection())).thenReturn(Map.of("FEMALE", "女", "MALE", "男"));
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.IDENTITY), anyCollection())).thenReturn(Map.of("WORKER", "职场人", "STUDENT", "在校生"));
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.EDUCATION_LEVEL), anyCollection())).thenReturn(Map.of("BACHELOR", "本科"));
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.INDUSTRY), anyCollection())).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.OCCUPATION), anyCollection())).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.ANNUAL_INCOME), anyCollection())).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.MARITAL_STATUS), anyCollection())).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.DATING_GOAL), anyCollection())).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.EMOTIONAL_STATUS), anyCollection())).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.PROFILE_TAG), anyCollection())).thenReturn(Map.of());
        lenient().when(profileDictionaryService.labels(eq(ProfileDictType.CHINA_REGION), anyCollection())).thenReturn(Map.of(
                "330000", "浙江省",
                "330100", "杭州市",
                "410000", "河南省",
                "410100", "郑州市",
                "410102", "中原区"));
    }
}

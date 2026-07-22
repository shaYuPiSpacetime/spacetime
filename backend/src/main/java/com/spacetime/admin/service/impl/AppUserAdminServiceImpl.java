package com.spacetime.admin.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.ImportBatchVO;
import com.spacetime.admin.dto.response.AppUserListVO;
import com.spacetime.admin.dto.response.AppUserStatsVO;
import com.spacetime.admin.dto.response.AppUserWorkflowHistoryVO;
import com.spacetime.admin.dto.response.VerificationDetailVO;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserExportTaskDao;
import com.spacetime.common.dao.AppUserImportBatchDao;
import com.spacetime.common.dao.AppUserImportRowDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.AppUserExportTask;
import com.spacetime.common.entity.AppUserImportBatch;
import com.spacetime.common.entity.AppUserImportRow;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.RegisterSourceEnum;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.exception.ForbiddenException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.Prd01ProfileCompletenessCalculator;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.RelationLifecycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 管理后台 — 小程序用户管理服务实现
 * 含用户分页查询（多条件筛选 + EXISTS子查询）、用户详情、账号状态变更
 * 认证状态筛选使用 EXISTS 子查询在 SQL 层完成，保证分页准确
 */
@Service
@RequiredArgsConstructor
public class AppUserAdminServiceImpl implements AppUserAdminService {

    /** 时间格式化器 */
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String COMMERCIAL_USER_VIEW = "commercial:user:view";
    private static final List<String> LIST_AUDIT_TYPES = List.of(
            AppUserAuditTypeEnum.REAL_NAME.getCode(),
            AppUserAuditTypeEnum.EDUCATION.getCode(),
            AppUserAuditTypeEnum.AVATAR.getCode(),
            AppUserAuditTypeEnum.ALBUM_PHOTO.getCode(),
            AppUserAuditTypeEnum.PROFILE_BG.getCode(),
            AppUserAuditTypeEnum.ABOUT_ME.getCode(),
            AppUserAuditTypeEnum.PROFILE_QA.getCode(),
            AppUserAuditTypeEnum.VOICE_INTRO.getCode());

    private final AppUserDao appUserDao;
    private final AppRelationVisitEventDao visitEventDao;
    private final AppUserAuditRecordDao auditRecordDao;
    private final AppUserExportTaskDao exportTaskDao;
    private final AppUserImportBatchDao importBatchDao;
    private final AppUserImportRowDao importRowDao;
    private final ContentOperationLogDao contentOperationLogDao;
    private final UserAssetDao userAssetDao;
    private final ProfileDictionaryService profileDictionaryService;
    private final AppUserAuditContentService auditContentService;
    private final Prd01ProfileCompletenessCalculator profileCompletenessCalculator;
    private final Prd01RuntimeConfigResolver runtimeConfigResolver;
    private final RelationAccessProjectionService relationAccessProjectionService;
    private final RelationLifecycleService relationLifecycleService;

    private static final Map<String, String> IMPORT_FIELD_ALIASES = Map.ofEntries(
            Map.entry("用户ID", "id"),
            Map.entry("登录方式", "loginMethod"),
            Map.entry("短信验证码", "smsCode"),
            Map.entry("微信授权信息", "wechatAuth"),
            Map.entry("登录协议/隐私协议同意", "agreementAccepted"),
            Map.entry("openid", "openid"),
            Map.entry("unionid", "unionid"),
            Map.entry("手机号", "phone"),
            Map.entry("phone", "phone"),
            Map.entry("昵称", "nickname"),
            Map.entry("nickname", "nickname"),
            Map.entry("性别", "gender"),
            Map.entry("gender", "gender"),
            Map.entry("出生日期", "birthday"),
            Map.entry("birthday", "birthday"),
            Map.entry("年龄", "age"),
            Map.entry("age", "age"),
            Map.entry("身高", "height"),
            Map.entry("height", "height"),
            Map.entry("体重", "weight"),
            Map.entry("weight", "weight"),
            Map.entry("身份", "identity"),
            Map.entry("identity", "identity"),
            Map.entry("行业", "industry"),
            Map.entry("industry", "industry"),
            Map.entry("职业", "occupation"),
            Map.entry("occupation", "occupation"),
            Map.entry("公司", "company"),
            Map.entry("company", "company"),
            Map.entry("年收入", "annualIncome"),
            Map.entry("annualIncome", "annualIncome"),
            Map.entry("现居省份", "locationProvince"),
            Map.entry("locationProvince", "locationProvince"),
            Map.entry("现居城市", "locationCity"),
            Map.entry("locationCity", "locationCity"),
            Map.entry("现居区县", "locationDistrict"),
            Map.entry("locationDistrict", "locationDistrict"),
            Map.entry("家乡省份", "hometownProvince"),
            Map.entry("hometownProvince", "hometownProvince"),
            Map.entry("家乡城市", "hometownCity"),
            Map.entry("hometownCity", "hometownCity"),
            Map.entry("家乡区县", "hometownDistrict"),
            Map.entry("hometownDistrict", "hometownDistrict"),
            Map.entry("脱单目标", "datingGoal"),
            Map.entry("datingGoal", "datingGoal"),
            Map.entry("婚姻状况", "maritalStatus"),
            Map.entry("maritalStatus", "maritalStatus"),
            Map.entry("感情状态", "emotionalStatus"),
            Map.entry("emotionalStatus", "emotionalStatus"),
            Map.entry("是否想要孩子", "wantChild"),
            Map.entry("wantChild", "wantChild"),
            Map.entry("子女计划", "childrenPlan"),
            Map.entry("childrenPlan", "childrenPlan"),
            Map.entry("学校", "school"),
            Map.entry("school", "school"),
            Map.entry("专业", "major"),
            Map.entry("major", "major"),
            Map.entry("最高学历", "educationLevel"),
            Map.entry("educationLevel", "educationLevel"),
            Map.entry("个人标签", "tags"),
            Map.entry("tags", "tags"),
            Map.entry("微信号", "wechatId"),
            Map.entry("wechatId", "wechatId"),
            Map.entry("爱听的歌曲", "favoriteSong"),
            Map.entry("爱听歌曲ID", "favoriteSongId"),
            Map.entry("favoriteSongId", "favoriteSongId"),
            Map.entry("爱听歌曲名称", "favoriteSongName"),
            Map.entry("favoriteSongName", "favoriteSongName"),
            Map.entry("爱听歌曲歌手", "favoriteSongArtist"),
            Map.entry("favoriteSongArtist", "favoriteSongArtist"),
            Map.entry("爱听歌曲封面URL", "favoriteSongCoverUrl"),
            Map.entry("favoriteSongCoverUrl", "favoriteSongCoverUrl"),
            Map.entry("MBTI", "mbtiType"),
            Map.entry("mbtiType", "mbtiType"),
            Map.entry("星座", "zodiac"),
            Map.entry("zodiac", "zodiac"),
            Map.entry("头像来源", "avatarSource"),
            Map.entry("裁剪后主头像", "avatarImage"),
            Map.entry("相册/附加照片", "photos"),
            Map.entry("资料背景图", "profileBgImage"),
            Map.entry("语音介绍文件", "voiceIntroUrl"),
            Map.entry("资料问答", "profileQaJson"),
            Map.entry("见面偏好", "meetingPreference"),
            Map.entry("喜欢的见面活动", "preferredActivities"),
            Map.entry("住房情况", "housingStatus"),
            Map.entry("购车情况", "carStatus"),
            Map.entry("有无子女", "hasChild"),
            Map.entry("结婚计划", "marriagePlan"),
            Map.entry("宗教信仰", "religion"),
            Map.entry("吸烟情况", "smoking"),
            Map.entry("饮酒情况", "drinking"),
            Map.entry("宠物态度", "pets"),
            Map.entry("真实姓名", "realName"),
            Map.entry("realName", "realName"),
            Map.entry("身份证号", "idCard"),
            Map.entry("idCard", "idCard"),
            Map.entry("单身承诺/认证协议勾选", "singleCommitmentChecked"),
            Map.entry("头像URL", "avatarUrl"),
            Map.entry("avatarUrl", "avatarUrl"),
            Map.entry("相册照片URL", "albumPhotoUrls"),
            Map.entry("albumPhotoUrls", "albumPhotoUrls"),
            Map.entry("资料背景图URL", "profileBgImageUrl"),
            Map.entry("profileBgImageUrl", "profileBgImageUrl"),
            Map.entry("语音介绍URL", "voiceIntroUrl"),
            Map.entry("voiceIntroUrl", "voiceIntroUrl"),
            Map.entry("语音介绍时长", "voiceIntroDuration"),
            Map.entry("voiceIntroDuration", "voiceIntroDuration"),
            Map.entry("自我介绍", "aboutMe"),
            Map.entry("aboutMe", "aboutMe"),
            Map.entry("关于我问答JSON", "profileQaJson"),
            Map.entry("profileQaJson", "profileQaJson"),
            Map.entry("学历人群", "educationUserType"),
            Map.entry("学校名称", "schoolName"),
            Map.entry("学生证/在读证明", "studentMaterials"),
            Map.entry("认证方式", "educationMethod"),
            Map.entry("毕业证或学位证书编号", "diplomaNo"),
            Map.entry("证书姓名", "certificateName"),
            Map.entry("毕业证/学位证材料", "certificateMaterials"),
            Map.entry("学历协议勾选", "educationAgreementChecked"),
            Map.entry("学历认证方式", "educationMethod"),
            Map.entry("educationMethod", "educationMethod"),
            Map.entry("学历材料URL", "educationMaterialUrls"),
            Map.entry("educationMaterialUrls", "educationMaterialUrls"),
            Map.entry("证书编号", "diplomaNo"),
            Map.entry("diplomaNo", "diplomaNo"),
            Map.entry("学信网在线验证码", "chsiCode"),
            Map.entry("学信网验证码", "chsiCode"),
            Map.entry("chsiCode", "chsiCode"));
    private static final Map<String, String> IMPORT_DICT_FIELDS = Map.ofEntries(
            Map.entry("gender", ProfileDictType.GENDER),
            Map.entry("identity", ProfileDictType.IDENTITY),
            Map.entry("identityType", ProfileDictType.IDENTITY),
            Map.entry("educationLevel", ProfileDictType.EDUCATION_LEVEL),
            Map.entry("industry", ProfileDictType.INDUSTRY),
            Map.entry("occupation", ProfileDictType.OCCUPATION),
            Map.entry("annualIncome", ProfileDictType.ANNUAL_INCOME),
            Map.entry("maritalStatus", ProfileDictType.MARITAL_STATUS),
            Map.entry("datingGoal", ProfileDictType.DATING_GOAL),
            Map.entry("emotionalStatus", ProfileDictType.EMOTIONAL_STATUS),
            Map.entry("educationMethod", ProfileDictType.EDUCATION_METHOD),
            Map.entry("locationProvince", ProfileDictType.CHINA_REGION),
            Map.entry("locationCity", ProfileDictType.CHINA_REGION),
            Map.entry("locationDistrict", ProfileDictType.CHINA_REGION),
            Map.entry("hometownProvince", ProfileDictType.CHINA_REGION),
            Map.entry("hometownCity", ProfileDictType.CHINA_REGION),
            Map.entry("hometownDistrict", ProfileDictType.CHINA_REGION));
    private static final Map<String, Map<String, String>> IMPORT_DICT_VALUE_ALIASES = Map.ofEntries(
            Map.entry(ProfileDictType.GENDER, Map.of("女", "FEMALE", "男", "MALE")),
            Map.entry(ProfileDictType.IDENTITY, Map.of("职场人", "WORKER", "在校生", "STUDENT")),
            Map.entry(ProfileDictType.EDUCATION_LEVEL, Map.ofEntries(
                    Map.entry("博士", "DOCTOR"),
                    Map.entry("硕士", "MASTER"),
                    Map.entry("本科", "BACHELOR"),
                    Map.entry("大专", "COLLEGE"),
                    Map.entry("高中/中专", "HIGH_SCHOOL"),
                    Map.entry("初中及以下", "JUNIOR_OR_BELOW"),
                    Map.entry("其他", "OTHER"))),
            Map.entry(ProfileDictType.INDUSTRY, Map.ofEntries(
                    Map.entry("互联网", "IT_INTERNET"),
                    Map.entry("IT/互联网", "IT_INTERNET"),
                    Map.entry("金融", "FINANCE"),
                    Map.entry("教育/科研", "EDUCATION_RESEARCH"),
                    Map.entry("医疗/健康", "HEALTHCARE"),
                    Map.entry("制造业", "MANUFACTURING"),
                    Map.entry("房地产/建筑", "REAL_ESTATE_CONSTRUCTION"),
                    Map.entry("政府/事业单位", "GOVERNMENT_PUBLIC"),
                    Map.entry("文化/传媒", "CULTURE_MEDIA"),
                    Map.entry("零售/服务业", "RETAIL_SERVICE"),
                    Map.entry("其他", "OTHER"))),
            Map.entry(ProfileDictType.OCCUPATION, Map.ofEntries(
                    Map.entry("产品经理", "PRODUCT_MANAGER"),
                    Map.entry("工程师", "ENGINEER"),
                    Map.entry("教师", "TEACHER"),
                    Map.entry("设计师", "DESIGNER"),
                    Map.entry("医生", "DOCTOR"),
                    Map.entry("金融从业者", "FINANCE"),
                    Map.entry("其他", "OTHER"))),
            Map.entry(ProfileDictType.ANNUAL_INCOME, Map.ofEntries(
                    Map.entry("10万以下", "BELOW_100K"),
                    Map.entry("10-15万", "FROM_100K_TO_150K"),
                    Map.entry("15-30万", "FROM_150K_TO_300K"),
                    Map.entry("30-50万", "FROM_300K_TO_500K"),
                    Map.entry("50万以上", "ABOVE_500K"),
                    Map.entry("其他", "OTHER"))),
            Map.entry(ProfileDictType.MARITAL_STATUS, Map.of(
                    "未婚", "SINGLE",
                    "离异", "DIVORCED",
                    "丧偶", "WIDOWED")),
            Map.entry(ProfileDictType.DATING_GOAL, Map.ofEntries(
                    Map.entry("时机成熟就结婚", "TIMING_MATURE"),
                    Map.entry("1-2年内结婚", "ONE_TO_TWO_YEARS"),
                    Map.entry("3-5年内结婚", "THREE_TO_FIVE_YEARS"),
                    Map.entry("想恋爱但不想结婚", "DATE_NOT_MARRY"))),
            Map.entry(ProfileDictType.EMOTIONAL_STATUS, Map.of(
                    "正在寻觅", "SEARCHING",
                    "佛系交友", "CASUAL",
                    "暂时不找", "NOT_LOOKING")),
            Map.entry(ProfileDictType.EDUCATION_METHOD, Map.ofEntries(
                    Map.entry("学信网验证码", "CHSI"),
                    Map.entry("学信网在线验证码", "CHSI"),
                    Map.entry("证书编号", "DIPLOMA_NO"),
                    Map.entry("毕业证或学位证书编号", "DIPLOMA_NO"),
                    Map.entry("证书材料", "MATERIAL_UPLOAD"),
                    Map.entry("上传证书", "MATERIAL_UPLOAD"),
                    Map.entry("上传毕业证或学位证书", "MATERIAL_UPLOAD"),
                    Map.entry("学生证材料", "STUDENT_CARD"))));

    @Override
    public Page<AppUserListVO> getUserPage(AppUserPageReq req) {
        boolean commercialVisible = hasCommercialPermission();
        if (StrUtil.isNotBlank(req.getVipStatus()) && !commercialVisible) {
            throw new ForbiddenException("无权按 VIP 状态筛选 APP 用户");
        }
        LambdaQueryWrapper<AppUser> wrapper = buildUserQueryWrapper(req);
        Page<AppUser> page = appUserDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);

        Page<AppUserListVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        List<Long> userIds = page.getRecords().stream().map(AppUser::getId).toList();
        if (userIds.isEmpty()) {
            result.setRecords(List.of());
            return result;
        }

        // 当前页所有审核事实只查询一次；头像、相册、状态和完整度均从同一批结果派生。
        AuditPageData auditPageData = loadAuditPageData(userIds);
        Map<Long, UserAsset> assetByUser = commercialVisible ? loadUserAssetMap(userIds) : Map.of();
        Prd01ProfileCompletenessCalculator.ProfileCompletenessRules completenessRules =
                profileCompletenessCalculator.loadRules();
        ProfileLabels profileLabels = loadProfileLabels(page.getRecords());
        int[] relationAccessAgeRange = accessAgeRange();

        result.setRecords(page.getRecords().stream()
                .map(user -> {
                    UserAuditFacts facts = auditPageData.factsFor(user.getId());
                    return toListVO(user, facts.latestAudits(), profileLabels,
                            facts.publicAvatar(), facts.ownerAlbumPhotos(), completenessRules,
                            facts.effectiveAuditTypes(), facts.effectiveProfileQaQuestionKeys(),
                            assetByUser.get(user.getId()), relationAccessAgeRange[0], relationAccessAgeRange[1]);
                })
                .toList());
        return result;
    }

    private LambdaQueryWrapper<AppUser> buildUserQueryWrapper(AppUserPageReq req) {
        String safeKeyword = StrUtil.blankToDefault(req.getKeyword(), "").replace("'", "''");
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<AppUser>()
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w
                        .like(AppUser::getNickname, req.getKeyword())
                        .or().like(AppUser::getSchool, req.getKeyword())
                        .or().like(AppUser::getTags, req.getKeyword())
                        .or().like(AppUser::getOpenid, safeKeyword)
                        .or().exists("SELECT 1 FROM app_user_audit_record ar WHERE ar.user_id = app_user.id"
                                + " AND ar.deleted = 0"
                                + " AND (ar.real_name LIKE '%" + safeKeyword + "%'"
                                + " OR ar.bound_phone LIKE '%" + safeKeyword + "%'"
                                + " OR ar.id_card LIKE '%" + safeKeyword + "%')"))
                .like(StrUtil.isNotBlank(req.getNickname()), AppUser::getNickname, req.getNickname())
                .like(StrUtil.isNotBlank(req.getSchool()), AppUser::getSchool, req.getSchool())
                .eq(StrUtil.isNotBlank(req.getAccountStatus()), AppUser::getAccountStatus, req.getAccountStatus())
                .eq(StrUtil.isNotBlank(req.getIdentity()), AppUser::getIdentity, req.getIdentity())
                .eq(StrUtil.isNotBlank(req.getGender()), AppUser::getGender, req.getGender())
                .eq(req.getFirstLoginCompleted() != null, AppUser::getFirstLoginCompleted, req.getFirstLoginCompleted())
                .eq(req.getUserId() != null, AppUser::getId, req.getUserId())
                .ge(StrUtil.isNotBlank(req.getRegisterTimeStart()), AppUser::getRegisterTime, req.getRegisterTimeStart() + " 00:00:00")
                .le(StrUtil.isNotBlank(req.getRegisterTimeEnd()), AppUser::getRegisterTime, req.getRegisterTimeEnd() + " 23:59:59")
                .orderByDesc(AppUser::getCreateTime);

        // 认证状态筛选：按统一审核记录的“最新提交记录”判断，避免历史旧状态误命中。
        if (StrUtil.isNotBlank(req.getRealNameStatus())) {
            wrapper.exists(latestStatusExistsSql(AppUserAuditTypeEnum.REAL_NAME, req.getRealNameStatus()));
        }
        if (StrUtil.isNotBlank(req.getEducationStatus())) {
            wrapper.exists(latestStatusExistsSql(AppUserAuditTypeEnum.EDUCATION, req.getEducationStatus()));
        }
        if (StrUtil.isNotBlank(req.getAvatarVerifyStatus())) {
            wrapper.exists(latestStatusExistsSql(AppUserAuditTypeEnum.AVATAR, req.getAvatarVerifyStatus()));
        }
        if (StrUtil.isNotBlank(req.getCoreAccessStatus())) {
            applyCoreAccessFilter(wrapper, req.getCoreAccessStatus());
        }
        if (StrUtil.isNotBlank(req.getCity())) {
            applyCityFilter(wrapper, req.getCity());
        }
        if (StrUtil.isNotBlank(req.getRelationshipAccess())) {
            applyRelationshipAccessFilter(wrapper, req.getRelationshipAccess());
        }
        if (StrUtil.isNotBlank(req.getVipStatus())) {
            applyVipStatusFilter(wrapper, req.getVipStatus());
        }
        // Demo 的「认证状态」是聚合筛选，落到三类认证状态字段。
        if (StrUtil.isNotBlank(req.getVerificationStatus())) {
            if ("REAL_NAME_APPROVED".equals(req.getVerificationStatus())) {
                wrapper.exists(effectiveExistsSql(AppUserAuditTypeEnum.REAL_NAME));
            } else if ("EDUCATION_APPROVED".equals(req.getVerificationStatus())) {
                wrapper.exists(effectiveExistsSql(AppUserAuditTypeEnum.EDUCATION));
            } else if ("AVATAR_APPROVED".equals(req.getVerificationStatus())) {
                wrapper.exists(latestStatusExistsSql(AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.APPROVED.getCode()));
            }
        }
        return wrapper;
    }

    @Override
    public AppUserStatsVO getUserStats() {
        AppUserStatsVO stats = new AppUserStatsVO();
        stats.setCurrentUserCount(countOrZero(appUserDao.count(new LambdaQueryWrapper<>())));

        LambdaQueryWrapper<AppUser> coreAllowed = new LambdaQueryWrapper<>();
        applyCoreAccessFilter(coreAllowed, "CORE_ALLOWED");
        stats.setCoreAccessAllowedCount(countOrZero(appUserDao.count(coreAllowed)));

        LambdaQueryWrapper<AppUser> relationshipOpen = new LambdaQueryWrapper<>();
        applyRelationshipAccessFilter(relationshipOpen, "OPEN");
        stats.setRelationshipAccessOpenCount(countOrZero(appUserDao.count(relationshipOpen)));
        stats.setVisitorUv7d(countOrZero(
                visitEventDao.countDistinctVisitorsSince(LocalDateTime.now().minusDays(7))));
        return stats;
    }

    @Override
    public AppUserDetailVO getUserDetail(Long id) {
        AppUser user = appUserDao.selectById(id);
        if (user == null) throw new BusinessException("用户不存在");
        return toDetailVO(user, loadLatestAuditMap(List.of(id)).get(id), loadProfileLabels(),
                userAssetDao.selectByUserId(id));
    }

    @Override
    @Transactional
    public void updateUserStatus(Long id, String status) {
        if (AccountStatusEnum.getByCode(status) == null) {
            throw new BusinessException("不支持的用户状态");
        }
        AppUser user = appUserDao.selectById(id);
        if (user == null) throw new BusinessException("用户不存在");
        String previousStatus = user.getAccountStatus();
        if ((AccountStatusEnum.CANCELLING.getCode().equals(status)
                || AccountStatusEnum.CANCELLED.getCode().equals(status))
                && StrUtil.isBlank(user.getAnonymousNo())) {
            user.setAnonymousNo("ANON-" + IdUtil.fastSimpleUUID().substring(0, 16).toUpperCase(Locale.ROOT));
        }
        user.setAccountStatus(status);
        appUserDao.updateById(user);
        if (AccountStatusEnum.FROZEN.getCode().equals(status)
                && !AccountStatusEnum.FROZEN.getCode().equals(previousStatus)) {
            relationLifecycleService.invalidateByUser(id, RelationInvalidReasonEnum.ACCOUNT_FROZEN, LocalDateTime.now());
        } else if ((AccountStatusEnum.CANCELLING.getCode().equals(status)
                || AccountStatusEnum.CANCELLED.getCode().equals(status))
                && !status.equals(previousStatus)) {
            relationLifecycleService.invalidateByUser(id, RelationInvalidReasonEnum.ACCOUNT_DELETED, LocalDateTime.now());
        }
    }

    @Override
    @Transactional
    public ImportBatchVO previewImport(String fileName, String content) {
        if (StrUtil.isBlank(fileName)) {
            throw new BusinessException("导入文件名不能为空");
        }
        if (StrUtil.isBlank(content)) {
            throw new BusinessException("导入文件内容不能为空");
        }
        List<String> lines = content.lines()
                .map(String::trim)
                .filter(StrUtil::isNotBlank)
                .toList();
        if (lines.size() <= 1) {
            throw new BusinessException("导入文件至少包含表头和一行数据");
        }

        String batchNo = "APP-IMPORT-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
        ImportCounter counter = validateImportRows(lines);
        String errorSummary = toJsonArray(counter.errors());

        AppUserImportBatch batch = new AppUserImportBatch();
        batch.setBatchNo(batchNo);
        batch.setFileName(fileName);
        batch.setTotalCount(counter.total());
        batch.setSuccessCount(counter.success());
        batch.setFailCount(counter.fail());
        batch.setStatus("PRECHECKED");
        batch.setErrorSummaryJson(errorSummary);
        importBatchDao.insert(batch);

        Long batchId = batch.getId();
        List<Long> importedUserIds = new ArrayList<>();
        for (ImportRowResult rowResult : counter.rows()) {
            AppUserImportRow row = new AppUserImportRow();
            row.setBatchId(batchId);
            row.setRowNo(rowResult.rowNo());
            row.setRawJson(rowResult.rawJson());
            row.setStatus(rowResult.status());
            row.setErrorMsg(rowResult.errorMsg());
            if ("VALID".equals(rowResult.status())) {
                AppUser imported = buildImportedUser(rowResult.rowData());
                appUserDao.insert(imported);
                importedUserIds.add(imported.getId());
                row.setUserId(imported.getId());
                row.setStatus("IMPORTED");
                createImportAuditRecords(imported, rowResult.rowData());
            }
            importRowDao.insert(row);
        }
        batch.setStatus(counter.fail() == 0 ? "IMPORTED" : "PARTIAL_IMPORTED");
        importBatchDao.updateById(batch);

        writeLog("PRD01_APP_USER_IMPORT", null, "IMPORT", null,
                "batchNo=" + batchNo + ", imported=" + importedUserIds.size() + ", fail=" + counter.fail());

        ImportBatchVO vo = new ImportBatchVO();
        vo.setBatchNo(batchNo);
        vo.setFileName(fileName);
        vo.setTotalCount(counter.total());
        vo.setSuccessCount(counter.success());
        vo.setFailCount(counter.fail());
        vo.setDuplicateCount(counter.duplicate());
        vo.setImportedCount(importedUserIds.size());
        vo.setImportedUserIds(importedUserIds);
        vo.setStatus(batch.getStatus());
        vo.setErrorSummaryJson(errorSummary);
        vo.setMessage("导入完成：成功入库 " + importedUserIds.size() + " 个用户，失败 " + counter.fail() + " 行");
        vo.setCreateTime(LocalDateTime.now());
        return vo;
    }

    @Override
    public ExportTaskVO exportFixedFields(AppUserPageReq req, boolean confirmNoMask) {
        if (!confirmNoMask) {
            throw new BusinessException("EXPORT_CONFIRM_REQUIRED: 固定字段不掩码导出必须二次确认");
        }
        String taskNo = "APP-USER-EXPORT-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
        String filterSummary = exportFilterSummary(req);
        List<AppUser> users = appUserDao.selectList(buildUserQueryWrapper(req == null ? new AppUserPageReq() : req));
        String csv = buildExportCsv(users);
        LocalDateTime taskTime = LocalDateTime.now();
        String taskFileName = "app-users-all-fields-" + taskTime.format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + ".csv";
        String taskMessage = "App 用户当前筛选结果导出文件已生成，导出字段为全部用户字段，图片资料输出 URL，导出文件不做掩码";
        AppUserExportTask task = new AppUserExportTask();
        task.setTaskNo(taskNo);
        task.setExportType("APP_USER_ALL_FIELDS");
        task.setStatus("CREATED");
        task.setMessage(taskMessage);
        task.setFilterSummary(filterSummary);
        task.setFileName(taskFileName);
        task.setRowCount(users.size());
        task.setDownloadContent(csv);
        task.setCreateTime(taskTime);
        exportTaskDao.insert(task);
        writeLog("PRD01_APP_USER_EXPORT", null, "CREATE", null,
                "taskNo=" + taskNo + ", rows=" + users.size() + ", filters=" + filterSummary);

        ExportTaskVO vo = new ExportTaskVO();
        vo.setTaskNo(taskNo);
        vo.setExportType("APP_USER_ALL_FIELDS");
        vo.setStatus("CREATED");
        vo.setMessage("App 用户当前筛选结果导出文件已生成，导出字段为全部用户字段，图片资料输出 URL，导出文件不做掩码");
        vo.setFilterSummary(filterSummary);
        vo.setFileName(taskFileName);
        vo.setRowCount(users.size());
        vo.setDownloadContent(csv);
        vo.setCreateTime(taskTime);
        return vo;
    }

    @Override
    public Page<AppUserWorkflowHistoryVO> getWorkflowHistory(int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 50);
        long offset = (long) (safePage - 1) * safeSize;
        long fetchSize = (long) safePage * safeSize;

        Page<AppUserImportBatch> importPage = importBatchDao.selectPage(new Page<>(1, fetchSize),
                new LambdaQueryWrapper<AppUserImportBatch>()
                        .orderByDesc(AppUserImportBatch::getCreateTime)
                        .orderByDesc(AppUserImportBatch::getId));
        Page<AppUserExportTask> exportPage = exportTaskDao.selectPage(new Page<>(1, fetchSize),
                new LambdaQueryWrapper<AppUserExportTask>()
                        .orderByDesc(AppUserExportTask::getCreateTime)
                        .orderByDesc(AppUserExportTask::getId));

        List<AppUserWorkflowHistoryVO> merged = new ArrayList<>();
        if (importPage.getRecords() != null) {
            importPage.getRecords().forEach(batch -> merged.add(toWorkflowHistory(batch)));
        }
        if (exportPage.getRecords() != null) {
            exportPage.getRecords().forEach(task -> merged.add(toWorkflowHistory(task)));
        }
        merged.sort(Comparator
                .comparing(AppUserWorkflowHistoryVO::getCreateTime,
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(AppUserWorkflowHistoryVO::getId, Comparator.reverseOrder()));

        Page<AppUserWorkflowHistoryVO> result = new Page<>(safePage, safeSize);
        result.setTotal(importPage.getTotal() + exportPage.getTotal());
        result.setRecords(merged.stream().skip(offset).limit(safeSize).toList());
        return result;
    }

    private AppUserWorkflowHistoryVO toWorkflowHistory(AppUserImportBatch batch) {
        AppUserWorkflowHistoryVO history = new AppUserWorkflowHistoryVO();
        history.setId("import-" + batch.getId());
        history.setType("import");
        history.setCreateTime(batch.getCreateTime());
        history.setImportResult(toImportBatchVO(batch));
        return history;
    }

    private AppUserWorkflowHistoryVO toWorkflowHistory(AppUserExportTask task) {
        AppUserWorkflowHistoryVO history = new AppUserWorkflowHistoryVO();
        history.setId("export-" + task.getId());
        history.setType("export");
        history.setCreateTime(task.getCreateTime());
        history.setExportResult(toExportTaskVO(task));
        return history;
    }

    private ImportBatchVO toImportBatchVO(AppUserImportBatch batch) {
        ImportBatchVO vo = new ImportBatchVO();
        vo.setBatchNo(batch.getBatchNo());
        vo.setFileName(batch.getFileName());
        vo.setTotalCount(batch.getTotalCount());
        vo.setSuccessCount(batch.getSuccessCount());
        vo.setFailCount(batch.getFailCount());
        vo.setDuplicateCount(0);
        vo.setImportedCount(batch.getSuccessCount());
        vo.setStatus(batch.getStatus());
        vo.setErrorSummaryJson(batch.getErrorSummaryJson());
        vo.setMessage("导入历史记录");
        vo.setCreateTime(batch.getCreateTime());
        return vo;
    }

    private ExportTaskVO toExportTaskVO(AppUserExportTask task) {
        ExportTaskVO vo = new ExportTaskVO();
        vo.setTaskNo(task.getTaskNo());
        vo.setExportType(task.getExportType());
        vo.setStatus(task.getStatus());
        vo.setMessage(task.getMessage());
        vo.setFilterSummary(task.getFilterSummary());
        vo.setFileName(task.getFileName());
        vo.setRowCount(task.getRowCount());
        vo.setDownloadContent(task.getDownloadContent());
        vo.setCreateTime(task.getCreateTime());
        return vo;
    }

    private String exportFilterSummary(AppUserPageReq req) {
        if (req == null) {
            return "全部用户";
        }
        List<String> parts = new ArrayList<>();
        addFilterPart(parts, "用户搜索", req.getKeyword());
        addFilterPart(parts, "昵称", req.getNickname());
        addFilterPart(parts, "学校", req.getSchool());
        addFilterPart(parts, "账号状态", req.getAccountStatus());
        addFilterPart(parts, "核心准入", req.getCoreAccessStatus());
        addFilterPart(parts, "认证状态", req.getVerificationStatus());
        addFilterPart(parts, "身份", req.getIdentity());
        addFilterPart(parts, "城市", req.getCity());
        addFilterPart(parts, "关系反馈准入", req.getRelationshipAccess());
        addFilterPart(parts, "VIP状态", req.getVipStatus());
        addFilterPart(parts, "性别", req.getGender());
        addFilterPart(parts, "实名认证状态", req.getRealNameStatus());
        addFilterPart(parts, "学历认证状态", req.getEducationStatus());
        addFilterPart(parts, "头像认证状态", req.getAvatarVerifyStatus());
        addFilterPart(parts, "首登完成", req.getFirstLoginCompleted() == null ? null : String.valueOf(req.getFirstLoginCompleted()));
        addFilterPart(parts, "用户ID", req.getUserId() == null ? null : String.valueOf(req.getUserId()));
        addFilterPart(parts, "注册开始", req.getRegisterTimeStart());
        addFilterPart(parts, "注册结束", req.getRegisterTimeEnd());
        return parts.isEmpty() ? "全部用户" : String.join("；", parts);
    }

    private void addFilterPart(List<String> parts, String label, String value) {
        if (StrUtil.isNotBlank(value)) {
            parts.add(label + "=" + value.trim());
        }
    }

    private String buildExportCsv(List<AppUser> users) {
        List<String> headers = List.of(
                "用户ID", "openid", "unionid", "手机号", "手机号摘要", "注册来源", "注册时间", "最近登录时间",
                "账号状态", "首登完成", "首登下一步骤",
                "昵称", "性别", "出生日期", "年龄", "身高", "体重", "身份", "行业", "职业", "公司", "年收入",
                "现居省份", "现居城市", "现居区县", "现居地", "家乡省份", "家乡城市", "家乡区县", "家乡",
                "脱单目标", "婚姻状况", "感情状态", "子女计划", "是否想要孩子", "学校", "专业", "最高学历",
                "个人标签", "微信号", "爱听歌曲ID", "爱听歌曲名称", "爱听歌曲歌手", "爱听歌曲封面URL", "MBTI", "星座",
                "头像URL", "头像认证状态", "头像审核来源", "头像提交时间", "头像审核时间", "头像驳回/失效原因",
                "相册照片URL", "资料背景图URL", "资料图片审核状态",
                "自我介绍", "资料问答", "开放文本审核状态",
                "语音介绍URL", "语音介绍时长", "语音审核状态",
                "真实姓名", "身份证号", "实名绑定手机号", "实名认证状态", "实名审核来源", "实名提交时间",
                "实名审核时间", "实名驳回/失效原因",
                "学历认证方式", "学历学校", "学历材料URL", "学信网验证码", "证书编号", "学历认证状态",
                "学历审核来源", "学历提交时间", "学历审核时间", "学历驳回/失效原因",
                "资料完整度", "千寻币", "VIP状态", "VIP到期时间", "创建时间", "更新时间");
        if (users == null || users.isEmpty()) {
            return headers.stream().map(this::csvCell).collect(Collectors.joining(","));
        }
        List<Long> userIds = users.stream()
                .map(AppUser::getId)
                .filter(id -> id != null)
                .toList();
        ProfileLabels labels = loadProfileLabels(users);
        Map<String, String> educationMethodLabels = safeLabels(ProfileDictType.EDUCATION_METHOD);
        AuditPageData auditPageData = loadAuditPageData(userIds);
        Map<Long, UserAsset> assets = loadUserAssetMap(userIds);
        List<String> lines = new ArrayList<>();
        lines.add(headers.stream().map(this::csvCell).collect(Collectors.joining(",")));
        for (AppUser user : users) {
            UserAuditFacts facts = auditPageData.factsFor(user.getId());
            Map<String, AppUserAuditRecord> audits = facts.latestAudits();
            AppUserAuditRecord avatar = audit(audits, AppUserAuditTypeEnum.AVATAR);
            AppUserAuditRecord album = audit(audits, AppUserAuditTypeEnum.ALBUM_PHOTO);
            AppUserAuditRecord profileBg = audit(audits, AppUserAuditTypeEnum.PROFILE_BG);
            AppUserAuditRecord realName = audit(audits, AppUserAuditTypeEnum.REAL_NAME);
            AppUserAuditRecord education = audit(audits, AppUserAuditTypeEnum.EDUCATION);
            AppUserAuditRecord aboutMe = audit(audits, AppUserAuditTypeEnum.ABOUT_ME);
            AppUserAuditRecord profileQa = audit(audits, AppUserAuditTypeEnum.PROFILE_QA);
            AppUserAuditRecord voice = audit(audits, AppUserAuditTypeEnum.VOICE_INTRO);
            AppUserAuditRecord mediaLatest = latestOf(audits, AppUserAuditTypeEnum.ALBUM_PHOTO, AppUserAuditTypeEnum.PROFILE_BG);
            AppUserAuditRecord textLatest = latestOf(audits, AppUserAuditTypeEnum.ABOUT_ME,
                    AppUserAuditTypeEnum.PROFILE_QA);
            UserAsset asset = assets.get(user.getId());
            List<String> cells = List.of(
                    text(user.getId()),
                    text(user.getOpenid()),
                    text(user.getUnionid()),
                    text(user.getPhone()),
                    text(user.getPhoneHash()),
                    registerSourceLabel(user.getRegisterSource()),
                    formatDateTime(user.getRegisterTime()),
                    formatDateTime(user.getLastLoginTime()),
                    ACCOUNT_STATUS_MAP_LABEL(user.getAccountStatus()),
                    Integer.valueOf(1).equals(user.getFirstLoginCompleted()) ? "是" : "否",
                    text(user.getFirstLoginNextStep()),
                    text(user.getNickname()),
                    labelOrBlank(labels.gender(), user.getGender()),
                    user.getBirthday() == null ? "" : user.getBirthday().toString(),
                    text(user.getAge()),
                    text(user.getHeight()),
                    text(user.getWeight()),
                    labelOrBlank(labels.identity(), user.getIdentity()),
                    labelOrBlank(labels.industry(), user.getIndustry()),
                    labelOrBlank(labels.occupation(), user.getOccupation()),
                    text(user.getCompany()),
                    labelOrBlank(labels.annualIncome(), user.getAnnualIncome()),
                    regionLabelOrBlank(labels, user.getLocationProvince()),
                    regionLabelOrBlank(labels, user.getLocationCity()),
                    regionLabelOrBlank(labels, user.getLocationDistrict()),
                    blankHyphenToEmpty(joinLocation(labels, user.getLocationProvince(), user.getLocationCity(), user.getLocationDistrict())),
                    regionLabelOrBlank(labels, user.getHometownProvince()),
                    regionLabelOrBlank(labels, user.getHometownCity()),
                    regionLabelOrBlank(labels, user.getHometownDistrict()),
                    blankHyphenToEmpty(joinLocation(labels, user.getHometownProvince(), user.getHometownCity(), user.getHometownDistrict())),
                    labelOrBlank(labels.datingGoal(), user.getDatingGoal()),
                    labelOrBlank(labels.maritalStatus(), user.getMaritalStatus()),
                    labelOrBlank(labels.emotionalStatus(), user.getEmotionalStatus()),
                    text(user.getChildrenPlan()),
                    text(user.getWantChild()),
                    text(user.getSchool()),
                    text(user.getMajor()),
                    labelOrBlank(labels.educationLevel(), user.getEducationLevel()),
                    String.join("|", splitArrayValue(toLabelJsonArray(user.getTags(), labels.profileTag()))),
                    text(user.getWechatId()),
                    text(user.getFavoriteSongId()),
                    text(user.getFavoriteSongName()),
                    text(user.getFavoriteSongArtist()),
                    text(user.getFavoriteSongCoverUrl()),
                    text(user.getMbtiType()),
                    text(user.getZodiac()),
                    text(avatar == null ? null : avatar.getMediaUrl()),
                    auditStatusLabel(statusOf(avatar)),
                    auditSourceLabel(avatar == null ? null : avatar.getAuditSource()),
                    text(formatSubmitTime(avatar)),
                    formatAuditTime(avatar),
                    text(reason(avatar)),
                    String.join("|", facts.ownerAlbumPhotos()),
                    text(profileBg == null ? null : profileBg.getMediaUrl()),
                    auditStatusLabel(statusOf(mediaLatest)),
                    text(aboutMe == null ? null : aboutMe.getContentText()),
                    text(profileQa == null ? null : profileQa.getContentText()),
                    auditStatusLabel(statusOf(textLatest)),
                    text(voice == null ? null : voice.getMediaUrl()),
                    text(voice == null ? null : voice.getDuration()),
                    auditStatusLabel(statusOf(voice)),
                    text(realName == null ? null : realName.getRealName()),
                    text(realName == null ? null : realName.getIdCard()),
                    text(realName == null ? null : realName.getBoundPhone()),
                    auditStatusLabel(statusOf(realName)),
                    auditSourceLabel(realName == null ? null : realName.getAuditSource()),
                    text(formatSubmitTime(realName)),
                    formatAuditTime(realName),
                    text(reason(realName)),
                    labelOrBlank(educationMethodLabels, education == null ? null : education.getEducationMethod()),
                    text(education == null ? null : education.getSchoolName()),
                    materialValue(education, "materialUrls"),
                    materialValue(education, "chsiCode"),
                    materialValue(education, "diplomaNo"),
                    auditStatusLabel(statusOf(education)),
                    auditSourceLabel(education == null ? null : education.getAuditSource()),
                    text(formatSubmitTime(education)),
                    formatAuditTime(education),
                    text(reason(education)),
                    profileCompletenessScore(user, facts),
                    text(asset == null ? null : asset.getCoinBalance()),
                    vipStatusLabel(asset == null ? null : asset.getVipStatus()),
                    formatDateTime(asset == null ? null : asset.getVipExpireTime()),
                    formatDateTime(user.getCreateTime()),
                    formatDateTime(user.getUpdateTime())
            );
            lines.add(cells.stream().map(this::csvCell).collect(Collectors.joining(",")));
        }
        return String.join("\n", lines);
    }

    private String ACCOUNT_STATUS_MAP_LABEL(String status) {
        if (AccountStatusEnum.NORMAL.getCode().equals(status)) return "正常";
        if (AccountStatusEnum.FROZEN.getCode().equals(status)) return "已冻结";
        if (AccountStatusEnum.CANCELLING.getCode().equals(status)) return "注销中";
        if (AccountStatusEnum.CANCELLED.getCode().equals(status)) return "已注销";
        return StrUtil.blankToDefault(status, "");
    }

    private String csvCell(String value) {
        return "\"" + StrUtil.blankToDefault(value, "").replace("\"", "\"\"") + "\"";
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String registerSourceLabel(String source) {
        if (StrUtil.isBlank(source)) {
            return "";
        }
        RegisterSourceEnum sourceEnum = RegisterSourceEnum.getByCode(source.trim());
        return sourceEnum == null ? source.trim() : sourceEnum.getDesc();
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "" : value.format(FMT);
    }

    private String formatAuditTime(AppUserAuditRecord record) {
        return record == null || record.getAuditTime() == null ? "" : record.getAuditTime().format(FMT);
    }

    private String labelOrBlank(Map<String, String> labels, String code) {
        return StrUtil.isBlank(code) ? "" : label(labels, code);
    }

    private String regionLabelOrBlank(ProfileLabels labels, String code) {
        return StrUtil.isBlank(code) ? "" : regionLabel(labels, code);
    }

    private String blankHyphenToEmpty(String value) {
        return "-".equals(value) ? "" : StrUtil.blankToDefault(value, "");
    }

    private String auditStatusLabel(String status) {
        return switch (StrUtil.blankToDefault(status, "")) {
            case "PENDING" -> "待审核";
            case "REVIEWING" -> "审核中";
            case "APPROVED" -> "已通过";
            case "REJECTED" -> "已驳回";
            case "EXPIRED" -> "已失效";
            case "NOT_SUBMITTED", "NOT_CERTIFIED" -> "未提交";
            default -> StrUtil.blankToDefault(status, "");
        };
    }

    private String auditSourceLabel(String source) {
        return switch (StrUtil.blankToDefault(source, "")) {
            case "MACHINE" -> "机审";
            case "MANUAL" -> "人工审核";
            case "MOCK" -> "Mock";
            default -> StrUtil.blankToDefault(source, "");
        };
    }

    private String vipStatusLabel(String status) {
        return switch (StrUtil.blankToDefault(status, "")) {
            case "active" -> "VIP会员";
            case "expired" -> "会员过期";
            case "inactive" -> "普通会员";
            default -> StrUtil.blankToDefault(status, "");
        };
    }

    private String materialValue(AppUserAuditRecord record, String key) {
        return record == null ? "" : jsonStringValue(record.getMaterialJson(), key);
    }

    private String jsonStringValue(String json, String key) {
        if (StrUtil.isBlank(json) || StrUtil.isBlank(key)) {
            return "";
        }
        String marker = "\"" + key + "\":\"";
        int start = json.indexOf(marker);
        if (start < 0) {
            return "";
        }
        start += marker.length();
        StringBuilder value = new StringBuilder();
        boolean escaping = false;
        for (int i = start; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (escaping) {
                value.append(ch);
                escaping = false;
            } else if (ch == '\\') {
                escaping = true;
            } else if (ch == '"') {
                break;
            } else {
                value.append(ch);
            }
        }
        return value.toString();
    }

    private String profileCompletenessScore(AppUser user, UserAuditFacts facts) {
        try {
            Prd01ProfileCompletenessCalculator.ProfileCompletenessRules rules = profileCompletenessCalculator.loadRules();
            if (rules != null) {
                return String.valueOf(profileCompletenessCalculator.calculate(
                        user, rules, facts.latestAudits(), facts.effectiveAuditTypes(),
                        facts.effectiveProfileQaQuestionKeys()));
            }
        } catch (RuntimeException ignored) {
            // 导出兜底：完整度配置异常不能影响用户资料导出。
        }
        try {
            return String.valueOf(profileCompletenessCalculator.calculate(user));
        } catch (RuntimeException ignored) {
            return "";
        }
    }

    private AppUserListVO toListVO(AppUser user, Map<String, AppUserAuditRecord> audits, ProfileLabels labels,
            String avatarUrl, List<String> albumPhotos,
            Prd01ProfileCompletenessCalculator.ProfileCompletenessRules completenessRules,
            Set<String> effectiveAuditTypes, Set<String> effectiveProfileQaQuestionKeys,
            UserAsset asset, int minAccessAge, int maxAccessAge) {
        AppUserListVO vo = new AppUserListVO();
        AppUserAuditRecord realName = audit(audits, AppUserAuditTypeEnum.REAL_NAME);
        AppUserAuditRecord education = audit(audits, AppUserAuditTypeEnum.EDUCATION);
        AppUserAuditRecord avatar = audit(audits, AppUserAuditTypeEnum.AVATAR);
        AppUserAuditRecord voice = audit(audits, AppUserAuditTypeEnum.VOICE_INTRO);
        vo.setId(user.getId());
        vo.setAvatar(avatarUrl);
        vo.setNickname(user.getNickname());
        vo.setGender(user.getGender());
        vo.setGenderLabel(label(labels.gender(), user.getGender()));
        vo.setAge(user.getAge());
        vo.setHeight(user.getHeight());
        vo.setWeight(user.getWeight());
        vo.setSchool(user.getSchool());
        vo.setPhone(maskPhone(firstNotBlank(realName == null ? null : realName.getBoundPhone(), phoneFromOpenid(user.getOpenid()))));
        vo.setCity(joinLocation(labels, user.getLocationProvince(), user.getLocationCity(), user.getLocationDistrict()));
        vo.setIdentityCode(user.getIdentity());
        vo.setIdentityLabel(label(labels.identity(), user.getIdentity()));
        vo.setIdentity(vo.getIdentityLabel());
        vo.setIndustryCode(user.getIndustry());
        vo.setIndustryLabel(label(labels.industry(), user.getIndustry()));
        vo.setOccupationCode(user.getOccupation());
        vo.setOccupationLabel(label(labels.occupation(), user.getOccupation()));
        vo.setOccupation(vo.getOccupationLabel());
        vo.setCompany(user.getCompany());
        vo.setAnnualIncomeCode(user.getAnnualIncome());
        vo.setAnnualIncomeLabel(label(labels.annualIncome(), user.getAnnualIncome()));
        vo.setAnnualIncome(vo.getAnnualIncomeLabel());
        vo.setEducationLevelCode(user.getEducationLevel());
        vo.setEducationLevelLabel(label(labels.educationLevel(), user.getEducationLevel()));
        vo.setWechatId(maskWechat(user.getWechatId()));
        boolean commercialVisible = hasCommercialPermission();
        vo.setVipVisible(commercialVisible);
        vo.setCoinBalance(commercialVisible ? (asset == null || asset.getCoinBalance() == null ? 0 : asset.getCoinBalance()) : null);
        vo.setVipStatus(commercialVisible ? effectiveVipStatus(asset) : null);
        vo.setVipExpireTime(commercialVisible && asset != null && asset.getVipExpireTime() != null
                ? asset.getVipExpireTime().format(FMT) : null);
        vo.setTags(toLabelJsonArray(user.getTags(), labels.profileTag()));
        vo.setPhotos(toJsonArray(albumPhotos));
        vo.setVoiceIntroDuration(voice == null ? null : voice.getDuration());
        vo.setVoiceIntroAuditStatus(statusOf(voice));
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted());
        vo.setProfileScore(profileCompletenessCalculator.calculate(
                user, completenessRules, audits, effectiveAuditTypes, effectiveProfileQaQuestionKeys));
        vo.setAccountStatus(user.getAccountStatus());
        vo.setRegisterTime(user.getRegisterTime() != null ? user.getRegisterTime().format(FMT) : null);
        vo.setLastLoginTime(user.getLastLoginTime() != null ? user.getLastLoginTime().format(FMT) : null);
        vo.setRealNameStatus(statusOf(realName));
        vo.setEducationStatus(statusOf(education));
        vo.setAvatarVerifyStatus(statusOf(avatar));
        vo.setAvatarAuditRecordId(avatar == null ? null : avatar.getId());
        vo.setAvatarAuditMediaUrl(avatar == null ? null : avatar.getMediaUrl());
        vo.setAvatarAuditThumbUrl(avatar == null ? null : avatar.getThumbUrl());
        vo.setAvatarAuditRejectReason(reason(avatar));
        vo.setAvatarAuditSubmitTime(formatSubmitTime(avatar));
        vo.setAccessStatus(computeAccessStatusLabel(user, audits, effectiveAuditTypes));
        vo.setRelationshipAccess(relationAccessProjectionService.project(
                user, tripleApproved(audits, effectiveAuditTypes), minAccessAge, maxAccessAge));
        return vo;
    }

    private String joinLocation(ProfileLabels labels, String province, String city, String district) {
        String provinceText = regionLabel(labels, province);
        String cityText = regionLabel(labels, city);
        String districtText = regionLabel(labels, district);
        if (StrUtil.isBlank(provinceText)) {
            return StrUtil.blankToDefault(cityText, districtText);
        }
        if (StrUtil.isBlank(cityText) || provinceText.equals(cityText)) {
            return provinceText + StrUtil.blankToDefault(districtText, "");
        }
        return provinceText + cityText + StrUtil.blankToDefault(districtText, "");
    }

    private String joinLocation(String province, String city) {
        if (StrUtil.isBlank(province)) {
            return StrUtil.blankToDefault(city, "");
        }
        if (StrUtil.isBlank(city) || province.equals(city)) {
            return province;
        }
        return province + city;
    }

    /** 手机号数据库保留明文，管理后台列表和详情默认只展示脱敏结果。 */
    private String maskPhone(String phone) {
        if (StrUtil.isBlank(phone) || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private ImportCounter validateImportRows(List<String> lines) {
        return validateImportRowsByHeader(lines);
    }

    private ImportCounter validateImportRowsLegacy(List<String> lines) {
        Set<String> phones = new HashSet<>();
        List<String> errors = new ArrayList<>();
        List<ImportRowResult> rows = new ArrayList<>();
        int success = 0;
        int duplicate = 0;
        for (int index = 1; index < lines.size(); index++) {
            int rowNo = index + 1;
            String[] cells = lines.get(index).split(",", -1);
            String phone = cell(cells, 0);
            String nickname = cell(cells, 1);
            String gender = cell(cells, 2);
            String school = cell(cells, 3);
            String idCard = cell(cells, 4);
            String error = null;
            if (StrUtil.isBlank(phone)) {
                error = "手机号不能为空";
            } else if (StrUtil.isBlank(nickname)) {
                error = "昵称不能为空";
            } else if (!phones.add(phone)) {
                error = "手机号重复";
                duplicate++;
            }
            String rawJson = "{\"phone\":\"" + escapeJson(phone) + "\",\"nickname\":\"" + escapeJson(nickname)
                    + "\",\"gender\":\"" + escapeJson(gender) + "\",\"school\":\"" + escapeJson(school)
                    + "\",\"idCard\":\"" + escapeJson(idCard) + "\"}";
            Map<String, String> rowData = new LinkedHashMap<>();
            rowData.put("phone", phone);
            rowData.put("nickname", nickname);
            rowData.put("gender", gender);
            rowData.put("school", school);
            rowData.put("idCard", idCard);
            if (error == null) {
                success++;
                rows.add(new ImportRowResult(rowNo, rawJson, "VALID", null, rowData));
            } else {
                errors.add("第" + rowNo + "行：" + error);
                rows.add(new ImportRowResult(rowNo, rawJson, "INVALID", error, rowData));
            }
        }
        return new ImportCounter(lines.size() - 1, success, errors.size(), duplicate, errors, rows);
    }

    private String cell(String[] cells, int index) {
        return index < cells.length ? cells[index].trim() : "";
    }

    private ImportCounter validateImportRowsByHeader(List<String> lines) {
        List<String> headers = parseCsvLine(lines.get(0)).stream()
                .map(this::canonicalImportField)
                .toList();
        Map<String, String> requiredFields = importRequiredFields();
        Set<String> phones = new HashSet<>();
        List<String> errors = new ArrayList<>();
        List<ImportRowResult> rows = new ArrayList<>();
        int success = 0;
        int duplicate = 0;
        for (int index = 1; index < lines.size(); index++) {
            int rowNo = index + 1;
            Map<String, String> rowData = importRowData(headers, parseCsvLine(lines.get(index)));
            String error = normalizeImportRowValues(rowData);
            String phone = rowData.getOrDefault("phone", "");
            if (error == null) {
                error = validateImportRequired(rowData, requiredFields);
            }
            if (error == null && StrUtil.isNotBlank(phone) && !phones.add(phone)) {
                error = "手机号重复";
                duplicate++;
            }
            if (error == null && StrUtil.isNotBlank(phone)
                    && appUserDao.selectOne(new LambdaQueryWrapper<AppUser>().eq(AppUser::getPhone, phone)) != null) {
                error = "手机号已存在";
                duplicate++;
            }
            String rawJson = toJsonObject(rowData);
            if (error == null) {
                success++;
                rows.add(new ImportRowResult(rowNo, rawJson, "VALID", null, rowData));
            } else {
                errors.add("第" + rowNo + "行：" + error);
                rows.add(new ImportRowResult(rowNo, rawJson, "INVALID", error, rowData));
            }
        }
        return new ImportCounter(lines.size() - 1, success, errors.size(), duplicate, errors, rows);
    }

    private List<String> parseCsvLine(String line) {
        List<String> cells = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (ch == ',' && !quoted) {
                cells.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        cells.add(current.toString().trim());
        return cells;
    }

    private String canonicalImportField(String header) {
        String normalized = StrUtil.blankToDefault(header, "").trim();
        if (StrUtil.isBlank(normalized)) {
            return "";
        }
        return IMPORT_FIELD_ALIASES.getOrDefault(normalized, normalized);
    }

    private Map<String, String> importRowData(List<String> headers, List<String> cells) {
        Map<String, String> rowData = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            String field = headers.get(i);
            if (StrUtil.isBlank(field)) {
                continue;
            }
            rowData.put(field, i < cells.size() ? cells.get(i).trim() : "");
        }
        applyImportFieldCompatibility(rowData);
        return rowData;
    }

    private void applyImportFieldCompatibility(Map<String, String> rowData) {
        mirrorImportField(rowData, "identity", "identityType");
        mirrorImportField(rowData, "identityType", "identity");
        mirrorImportField(rowData, "idCard", "idCardNo");
        mirrorImportField(rowData, "idCardNo", "idCard");
        mirrorImportField(rowData, "schoolName", "school");
        mirrorImportField(rowData, "certificateName", "realName");
        mirrorImportField(rowData, "avatarImage", "avatarUrl");
        mirrorImportField(rowData, "photos", "albumPhotoUrls");
        mirrorImportField(rowData, "profileBgImage", "profileBgImageUrl");
        mirrorImportField(rowData, "studentMaterials", "educationMaterialUrls");
        mirrorImportField(rowData, "certificateMaterials", "educationMaterialUrls");
        mirrorImportField(rowData, "favoriteSong", "favoriteSongName");
        mirrorImportField(rowData, "favoriteSongName", "favoriteSong");
        mirrorImportField(rowData, "profileQaJson", "profileQa");
        mirrorImportField(rowData, "profileQa", "profileQaJson");
        mirrorImportField(rowData, "qaList", "profileQa");
        mirrorImportField(rowData, "profileQaJson", "qaList");
        mirrorImportField(rowData, "profileQa", "qaList");
        mirrorImportField(rowData, "qaList", "profileQaJson");
    }

    private void mirrorImportField(Map<String, String> rowData, String from, String to) {
        String value = rowData.get(from);
        if (StrUtil.isNotBlank(value) && StrUtil.isBlank(rowData.get(to))) {
            rowData.put(to, value);
        }
    }

    private String normalizeImportRowValues(Map<String, String> rowData) {
        for (Map.Entry<String, String> entry : IMPORT_DICT_FIELDS.entrySet()) {
            String field = entry.getKey();
            String value = rowData.get(field);
            if (StrUtil.isBlank(value)) {
                continue;
            }
            String normalized = normalizeDictValue(entry.getValue(), value);
            if (normalized == null) {
                return importFieldLabel(field) + "选项不存在：" + value;
            }
            rowData.put(field, normalized);
        }
        String tags = rowData.get("tags");
        if (StrUtil.isNotBlank(tags)) {
            rowData.put("tags", normalizeMultiDictValues(ProfileDictType.PROFILE_TAG, tags));
        }
        applyImportFieldCompatibility(rowData);
        return null;
    }

    private String normalizeDictValue(String dictType, String value) {
        String trimmed = StrUtil.trim(value);
        Map<String, String> labels = safeLabels(dictType);
        String aliasCode = IMPORT_DICT_VALUE_ALIASES.getOrDefault(dictType, Map.of()).get(trimmed);
        if (StrUtil.isNotBlank(aliasCode)) {
            return aliasCode;
        }
        if (labels.isEmpty() || labels.containsKey(trimmed)) {
            return trimmed;
        }
        for (Map.Entry<String, String> entry : labels.entrySet()) {
            if (trimmed.equals(entry.getValue())) {
                return entry.getKey();
            }
        }
        return null;
    }

    private String normalizeMultiDictValues(String dictType, String raw) {
        List<String> normalized = new ArrayList<>();
        for (String item : raw.split("[,，|｜]")) {
            String value = StrUtil.trim(item);
            if (StrUtil.isBlank(value)) {
                continue;
            }
            String code = normalizeDictValue(dictType, value);
            normalized.add(code == null ? value : code);
        }
        return String.join(",", normalized);
    }

    private Map<String, String> safeLabels(String dictType) {
        try {
            Map<String, String> labels = profileDictionaryService.labels(dictType);
            return labels == null ? Map.of() : labels;
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private String importFieldLabel(String field) {
        return switch (field) {
            case "gender" -> "性别";
            case "identity", "identityType" -> "身份";
            case "educationLevel" -> "最高学历";
            case "industry" -> "行业";
            case "occupation" -> "职业";
            case "annualIncome" -> "年收入";
            case "maritalStatus" -> "婚姻状况";
            case "datingGoal" -> "脱单目标";
            case "emotionalStatus" -> "感情状态";
            case "educationMethod" -> "学历认证方式";
            case "locationProvince", "locationCity", "locationDistrict",
                    "hometownProvince", "hometownCity", "hometownDistrict" -> "地区";
            default -> field;
        };
    }

    private AppUser buildImportedUser(Map<String, String> rowData) {
        AppUser user = new AppUser();
        String phone = value(rowData, "phone");
        user.setOpenid(StrUtil.isBlank(phone) ? null : "import_" + phone);
        user.setPhone(phone);
        if (StrUtil.isNotBlank(phone)) {
            user.setPhoneHash(hashPhone(phone));
        }
        user.setRegisterSource("ADMIN_IMPORT");
        user.setRegisterTime(LocalDateTime.now());
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(1);
        user.setNickname(value(rowData, "nickname"));
        user.setGender(value(rowData, "gender"));
        user.setBirthday(parseDate(value(rowData, "birthday")));
        user.setAge(parseInt(value(rowData, "age")));
        user.setHeight(parseInt(value(rowData, "height")));
        user.setWeight(parseInt(value(rowData, "weight")));
        user.setIdentity(value(rowData, "identity"));
        user.setIndustry(value(rowData, "industry"));
        user.setOccupation(value(rowData, "occupation"));
        user.setCompany(value(rowData, "company"));
        user.setAnnualIncome(value(rowData, "annualIncome"));
        user.setLocationProvince(value(rowData, "locationProvince"));
        user.setLocationCity(value(rowData, "locationCity"));
        user.setLocationDistrict(value(rowData, "locationDistrict"));
        user.setHometownProvince(value(rowData, "hometownProvince"));
        user.setHometownCity(value(rowData, "hometownCity"));
        user.setHometownDistrict(value(rowData, "hometownDistrict"));
        user.setDatingGoal(value(rowData, "datingGoal"));
        user.setMaritalStatus(value(rowData, "maritalStatus"));
        user.setEmotionalStatus(value(rowData, "emotionalStatus"));
        user.setChildrenPlan(value(rowData, "childrenPlan"));
        user.setWantChild(value(rowData, "wantChild"));
        user.setSchool(value(rowData, "school"));
        user.setMajor(value(rowData, "major"));
        user.setEducationLevel(value(rowData, "educationLevel"));
        user.setTags(value(rowData, "tags"));
        user.setWechatId(value(rowData, "wechatId"));
        user.setFavoriteSongId(value(rowData, "favoriteSongId"));
        user.setFavoriteSongName(value(rowData, "favoriteSongName"));
        user.setFavoriteSongArtist(value(rowData, "favoriteSongArtist"));
        user.setFavoriteSongCoverUrl(value(rowData, "favoriteSongCoverUrl"));
        user.setMbtiType(value(rowData, "mbtiType"));
        user.setZodiac(value(rowData, "zodiac"));
        return user;
    }

    private void createImportAuditRecords(AppUser user, Map<String, String> rowData) {
        createMediaAudit(user, AppUserAuditTypeEnum.AVATAR, value(rowData, "avatarUrl"), null);
        for (String url : splitUrlList(value(rowData, "albumPhotoUrls"))) {
            createMediaAudit(user, AppUserAuditTypeEnum.ALBUM_PHOTO, url, null);
        }
        createMediaAudit(user, AppUserAuditTypeEnum.PROFILE_BG, value(rowData, "profileBgImageUrl"), null);
        createTextAudit(user, AppUserAuditTypeEnum.ABOUT_ME, value(rowData, "aboutMe"), null);
        createProfileQaAudit(user, rowData);
        createVoiceAudit(user, rowData);
        createRealNameAudit(user, rowData);
        createEducationAudit(user, rowData);
    }

    private void createProfileQaAudit(AppUser user, Map<String, String> rowData) {
        String qaContent = StrUtil.blankToDefault(value(rowData, "profileQaJson"),
                StrUtil.blankToDefault(value(rowData, "profileQa"),
                        StrUtil.blankToDefault(value(rowData, "qaList"), value(rowData, "meetingPreference"))));
        if (StrUtil.isBlank(qaContent)) {
            qaContent = importProfileQaContent(rowData);
        }
        if (StrUtil.isBlank(qaContent)) {
            return;
        }
        createTextAudit(user, AppUserAuditTypeEnum.PROFILE_QA, qaContent,
                "{\"questionKey\":\"ADMIN_IMPORT_PROFILE_QA\"}");
    }

    private String importProfileQaContent(Map<String, String> rowData) {
        List<String> parts = new ArrayList<>();
        addProfileQaPart(parts, "见面偏好", "meetingPreference", rowData);
        addProfileQaPart(parts, "喜欢的见面活动", "preferredActivities", rowData);
        addProfileQaPart(parts, "住房情况", "housingStatus", rowData);
        addProfileQaPart(parts, "购车情况", "carStatus", rowData);
        addProfileQaPart(parts, "有无子女", "hasChild", rowData);
        addProfileQaPart(parts, "结婚计划", "marriagePlan", rowData);
        addProfileQaPart(parts, "宗教信仰", "religion", rowData);
        addProfileQaPart(parts, "吸烟情况", "smoking", rowData);
        addProfileQaPart(parts, "饮酒情况", "drinking", rowData);
        addProfileQaPart(parts, "宠物态度", "pets", rowData);
        return String.join("\n", parts);
    }

    private void addProfileQaPart(List<String> parts, String label, String field, Map<String, String> rowData) {
        String value = value(rowData, field);
        if (StrUtil.isNotBlank(value)) {
            parts.add(label + "：" + value);
        }
    }

    private void createMediaAudit(AppUser user, AppUserAuditTypeEnum type, String mediaUrl, String extraJson) {
        if (StrUtil.isBlank(mediaUrl)) {
            return;
        }
        AppUserAuditRecord record = baseImportAudit(user, type);
        record.setMediaUrl(mediaUrl);
        record.setThumbUrl(mediaUrl);
        record.setExtraJson(extraJson);
        auditRecordDao.insert(record);
    }

    private void createTextAudit(AppUser user, AppUserAuditTypeEnum type, String text, String materialJson) {
        if (StrUtil.isBlank(text)) {
            return;
        }
        AppUserAuditRecord record = baseImportAudit(user, type);
        record.setContentText(text);
        record.setMaterialJson(materialJson);
        auditRecordDao.insert(record);
    }

    private void createVoiceAudit(AppUser user, Map<String, String> rowData) {
        String voiceUrl = value(rowData, "voiceIntroUrl");
        if (StrUtil.isBlank(voiceUrl)) {
            return;
        }
        AppUserAuditRecord record = baseImportAudit(user, AppUserAuditTypeEnum.VOICE_INTRO);
        record.setMediaUrl(voiceUrl);
        record.setDuration(parseInt(value(rowData, "voiceIntroDuration")));
        auditRecordDao.insert(record);
    }

    private void createRealNameAudit(AppUser user, Map<String, String> rowData) {
        String realName = value(rowData, "realName");
        String idCard = value(rowData, "idCard");
        if (StrUtil.isAllBlank(realName, idCard)) {
            return;
        }
        AppUserAuditRecord record = baseImportAudit(user, AppUserAuditTypeEnum.REAL_NAME);
        record.setRealName(realName);
        record.setIdCard(idCard);
        record.setBoundPhone(user.getPhone());
        auditRecordDao.insert(record);
    }

    private void createEducationAudit(AppUser user, Map<String, String> rowData) {
        if (StrUtil.isAllBlank(value(rowData, "educationMethod"), value(rowData, "educationMaterialUrls"),
                value(rowData, "diplomaNo"), value(rowData, "chsiCode"))) {
            return;
        }
        AppUserAuditRecord record = baseImportAudit(user, AppUserAuditTypeEnum.EDUCATION);
        record.setEducationMethod(value(rowData, "educationMethod"));
        record.setSchoolName(StrUtil.blankToDefault(value(rowData, "school"), user.getSchool()));
        record.setMaterialJson("{\"materialUrls\":\"" + escapeJson(value(rowData, "educationMaterialUrls"))
                + "\",\"diplomaNo\":\"" + escapeJson(value(rowData, "diplomaNo"))
                + "\",\"chsiCode\":\"" + escapeJson(value(rowData, "chsiCode")) + "\"}");
        auditRecordDao.insert(record);
    }

    private AppUserAuditRecord baseImportAudit(AppUser user, AppUserAuditTypeEnum type) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(user.getId());
        record.setAuditGroup(type.getGroup());
        record.setAuditType(type.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setAuditSource("MANUAL");
        record.setSubmitTime(LocalDateTime.now());
        record.setExtraJson("{\"source\":\"ADMIN_IMPORT\"}");
        return record;
    }

    private List<String> splitUrlList(String raw) {
        if (StrUtil.isBlank(raw)) {
            return List.of();
        }
        return java.util.Arrays.stream(raw.split("[|｜,，]"))
                .map(String::trim)
                .filter(StrUtil::isNotBlank)
                .toList();
    }

    private String value(Map<String, String> rowData, String key) {
        return StrUtil.trim(rowData.get(key));
    }

    private Integer parseInt(String value) {
        if (StrUtil.isBlank(value)) {
            return null;
        }
        try {
            return Integer.valueOf(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalDate parseDate(String value) {
        if (StrUtil.isBlank(value)) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String hashPhone(String phone) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(phone.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new BusinessException("手机号安全摘要生成失败");
        }
    }

    private Map<String, String> importRequiredFields() {
        try {
            Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot = runtimeConfigResolver.snapshot();
            Map<String, String> required = new LinkedHashMap<>();
            for (Map<String, Object> item : runtimeConfigResolver.fieldSettings(snapshot)) {
                String fieldId = String.valueOf(item.getOrDefault("fieldId", ""));
                String label = String.valueOf(item.getOrDefault("label", fieldId));
                boolean visible = Boolean.TRUE.equals(item.get("visible"));
                boolean requiredFlag = Boolean.TRUE.equals(item.get("required"));
                if (StrUtil.isNotBlank(fieldId) && visible && requiredFlag) {
                    required.put(fieldId, StrUtil.blankToDefault(label, fieldId));
                }
            }
            if (!required.isEmpty()) {
                return required;
            }
        } catch (Exception ignored) {
            // 配置暂不可读时，只保留最小账号门槛，避免导入空用户。
        }
        return Map.of("phone", "手机号");
    }

    private String validateImportRequired(Map<String, String> rowData, Map<String, String> requiredFields) {
        for (Map.Entry<String, String> entry : requiredFields.entrySet()) {
            if (StrUtil.isBlank(rowData.get(entry.getKey()))) {
                return entry.getValue() + "不能为空";
            }
        }
        return null;
    }

    private String toJsonObject(Map<String, String> rowData) {
        return rowData.entrySet().stream()
                .map(entry -> "\"" + escapeJson(entry.getKey()) + "\":\"" + escapeJson(entry.getValue()) + "\"")
                .collect(Collectors.joining(",", "{", "}"));
    }

    private String toJsonArray(List<String> errors) {
        return "[" + errors.stream()
                .map(item -> "\"" + escapeJson(item) + "\"")
                .collect(Collectors.joining(",")) + "]";
    }

    private String escapeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void writeLog(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        contentOperationLogDao.insert(log);
    }

    private record ImportCounter(int total, int success, int fail, int duplicate, List<String> errors, List<ImportRowResult> rows) {
    }

    private record ImportRowResult(int rowNo, String rawJson, String status, String errorMsg, Map<String, String> rowData) {
    }

    /** 计算准入状态标签：账号/首登阻断→blocked，三重认证未全通过→browse_only，全通过→full_access。 */
    private String computeAccessStatusLabel(AppUser user, Map<String, AppUserAuditRecord> audits) {
        return canBrowse(user) ? (tripleApproved(audits) ? "full_access" : "browse_only") : "blocked";
    }

    private String computeAccessStatusLabel(AppUser user, Map<String, AppUserAuditRecord> audits,
            Set<String> effectiveAuditTypes) {
        return canBrowse(user)
                ? (tripleApproved(audits, effectiveAuditTypes) ? "full_access" : "browse_only")
                : "blocked";
    }

    private AppUserDetailVO toDetailVO(AppUser user, Map<String, AppUserAuditRecord> audits, ProfileLabels labels,
            UserAsset asset) {
        AppUserAuditRecord realName = audit(audits, AppUserAuditTypeEnum.REAL_NAME);
        AppUserAuditRecord education = audit(audits, AppUserAuditTypeEnum.EDUCATION);
        AppUserAuditRecord avatar = audit(audits, AppUserAuditTypeEnum.AVATAR);
        AppUserAuditRecord media = latestOf(audits, AppUserAuditTypeEnum.ALBUM_PHOTO, AppUserAuditTypeEnum.PROFILE_BG);
        AppUserAuditRecord text = latestOf(audits, AppUserAuditTypeEnum.ABOUT_ME,
                AppUserAuditTypeEnum.PROFILE_QA);
        AppUserAuditRecord voice = audit(audits, AppUserAuditTypeEnum.VOICE_INTRO);
        AppUserDetailVO vo = new AppUserDetailVO();
        vo.setId(user.getId());
        vo.setNickname(user.getNickname());
        vo.setAvatar(auditContentService.publicAvatar(user.getId()));
        vo.setGender(user.getGender());
        vo.setGenderLabel(label(labels.gender(), user.getGender()));
        vo.setBirthday(user.getBirthday() != null ? user.getBirthday().toString() : null);
        vo.setAge(user.getAge());
        vo.setHeight(user.getHeight());
        vo.setWeight(user.getWeight());
        vo.setIdentityCode(user.getIdentity());
        vo.setIdentityLabel(label(labels.identity(), user.getIdentity()));
        vo.setIdentity(vo.getIdentityLabel());
        vo.setIndustryCode(user.getIndustry());
        vo.setIndustryLabel(label(labels.industry(), user.getIndustry()));
        vo.setOccupationCode(user.getOccupation());
        vo.setOccupationLabel(label(labels.occupation(), user.getOccupation()));
        vo.setOccupation(vo.getOccupationLabel());
        vo.setCompany(user.getCompany());
        vo.setAnnualIncomeCode(user.getAnnualIncome());
        vo.setAnnualIncomeLabel(label(labels.annualIncome(), user.getAnnualIncome()));
        vo.setAnnualIncome(vo.getAnnualIncomeLabel());
        vo.setLocationProvince(user.getLocationProvince());
        vo.setLocationCity(user.getLocationCity());
        vo.setLocationDistrict(user.getLocationDistrict());
        vo.setLocationProvinceLabel(regionLabel(labels, user.getLocationProvince()));
        vo.setLocationCityLabel(regionLabel(labels, user.getLocationCity()));
        vo.setLocationDistrictLabel(regionLabel(labels, user.getLocationDistrict()));
        vo.setHometownProvince(user.getHometownProvince());
        vo.setHometownCity(user.getHometownCity());
        vo.setHometownDistrict(user.getHometownDistrict());
        vo.setHometownProvinceLabel(regionLabel(labels, user.getHometownProvince()));
        vo.setHometownCityLabel(regionLabel(labels, user.getHometownCity()));
        vo.setHometownDistrictLabel(regionLabel(labels, user.getHometownDistrict()));
        vo.setSchool(user.getSchool());
        vo.setPhone(maskPhone(firstNotBlank(realName == null ? null : realName.getBoundPhone(), phoneFromOpenid(user.getOpenid()))));
        vo.setMajor(user.getMajor());
        vo.setEducationLevelCode(user.getEducationLevel());
        vo.setEducationLevelLabel(label(labels.educationLevel(), user.getEducationLevel()));
        vo.setEducationLevel(vo.getEducationLevelLabel());
        vo.setEmotionalStatusCode(user.getEmotionalStatus());
        vo.setEmotionalStatusLabel(label(labels.emotionalStatus(), user.getEmotionalStatus()));
        vo.setEmotionalStatus(vo.getEmotionalStatusLabel());
        vo.setDatingGoalCode(user.getDatingGoal());
        vo.setDatingGoalLabel(label(labels.datingGoal(), user.getDatingGoal()));
        vo.setDatingGoal(vo.getDatingGoalLabel());
        vo.setMaritalStatusCode(user.getMaritalStatus());
        vo.setMaritalStatusLabel(label(labels.maritalStatus(), user.getMaritalStatus()));
        vo.setMaritalStatus(vo.getMaritalStatusLabel());
        vo.setAboutMe(auditContentService.ownerText(user.getId(), AppUserAuditTypeEnum.ABOUT_ME));
        vo.setTags(toLabelJsonArray(user.getTags(), labels.profileTag()));
        vo.setWechatId(maskWechat(user.getWechatId()));
        vo.setFavoriteSongId(user.getFavoriteSongId());
        vo.setFavoriteSongName(user.getFavoriteSongName());
        vo.setFavoriteSongArtist(user.getFavoriteSongArtist());
        vo.setFavoriteSongCoverUrl(user.getFavoriteSongCoverUrl());
        vo.setCoinBalance(asset == null || asset.getCoinBalance() == null ? 0 : asset.getCoinBalance());
        vo.setVipStatus(asset == null ? "inactive" : StrUtil.blankToDefault(asset.getVipStatus(), "inactive"));
        vo.setVipExpireTime(asset == null || asset.getVipExpireTime() == null ? null : asset.getVipExpireTime().format(FMT));
        vo.setPhotos(toJsonArray(auditContentService.ownerAlbumPhotos(user.getId())));
        vo.setProfileBgImage(auditContentService.ownerProfileBackground(user.getId()));
        vo.setVoiceIntroUrl(voice != null && latestApproved(voice) ? voice.getMediaUrl() : null);
        vo.setVoiceIntroDuration(voice == null ? null : voice.getDuration());
        vo.setVoiceIntroAuditStatus(statusOf(voice));
        vo.setVoiceIntroRejectReason(reason(voice));
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setProfileScore(profileCompletenessCalculator.calculate(user));
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted());
        vo.setRegisterTime(user.getRegisterTime() != null ? user.getRegisterTime().format(FMT) : null);
        vo.setLastLoginTime(user.getLastLoginTime() != null ? user.getLastLoginTime().format(FMT) : null);
        vo.setAccountStatus(user.getAccountStatus());
        vo.setAvatarAuditRecordId(avatar == null ? null : avatar.getId());
        vo.setAvatarAuditMediaUrl(avatar == null ? null : avatar.getMediaUrl());
        vo.setAvatarAuditThumbUrl(avatar == null ? null : avatar.getThumbUrl());
        vo.setAvatarAuditRejectReason(reason(avatar));
        vo.setAvatarAuditSubmitTime(formatSubmitTime(avatar));
        boolean canBrowse = canBrowse(user);
        boolean tripleApproved = tripleApproved(audits);
        vo.setCanBrowseCards(canBrowse);
        vo.setCanMatch(canBrowse && tripleApproved);
        vo.setCanBeExposed(canBrowse && tripleApproved);
        vo.setBlockReason(canBrowse ? (tripleApproved ? null : "三重认证未全部通过") : blockedReason(user));
        vo.setViolationCount(0);
        vo.setFeedbackCount(0);
        VerificationDetailVO vd = new VerificationDetailVO();
        vd.setRealNameStatus(statusOf(realName));
        vd.setRealNameRejectReason(reason(realName));
        vd.setRealNameSubmitTime(formatSubmitTime(realName));
        vd.setEducationStatus(statusOf(education));
        vd.setEducationMethod(education == null ? null : education.getEducationMethod());
        vd.setEducationRejectReason(reason(education));
        vd.setEducationSubmitTime(formatSubmitTime(education));
        vd.setAvatarVerifyStatus(statusOf(avatar));
        vd.setAvatarVerifyRejectReason(reason(avatar));
        vd.setAvatarVerifySubmitTime(formatSubmitTime(avatar));
        vd.setProfilePhotoAuditStatus(statusOf(media));
        vd.setProfilePhotoRejectReason(reason(media));
        vd.setOpenTextAuditStatus(statusOf(text));
        vd.setOpenTextRejectReason(reason(text));
        vd.setVerifyLevel(verifyLevel(audits));
        vo.setVerification(vd);
        return vo;
    }

    private Map<Long, Map<String, AppUserAuditRecord>> loadLatestAuditMap(List<Long> userIds) {
        return loadAuditPageData(userIds).latestByUser();
    }

    private Map<Long, UserAsset> loadUserAssetMap(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        Page<UserAsset> page = userAssetDao.selectPage(new Page<>(1, userIds.size()),
                new LambdaQueryWrapper<UserAsset>().in(UserAsset::getUserId, userIds));
        if (page == null || page.getRecords() == null) {
            return Map.of();
        }
        return page.getRecords().stream()
                .filter(asset -> asset.getUserId() != null)
                .collect(Collectors.toMap(UserAsset::getUserId, asset -> asset, (left, right) -> left));
    }

    private AuditPageData loadAuditPageData(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return AuditPageData.empty();
        }
        List<AppUserAuditRecord> records = auditRecordDao.selectList(new LambdaQueryWrapper<AppUserAuditRecord>()
                .in(AppUserAuditRecord::getUserId, userIds)
                .in(AppUserAuditRecord::getAuditType, LIST_AUDIT_TYPES)
                .orderByAsc(AppUserAuditRecord::getUserId)
                .orderByDesc(AppUserAuditRecord::getSubmitTime)
                .orderByDesc(AppUserAuditRecord::getId));
        if (records == null || records.isEmpty()) {
            return AuditPageData.empty();
        }
        return AuditPageData.from(records);
    }

    private void applyCoreAccessFilter(LambdaQueryWrapper<AppUser> wrapper, String coreAccessStatus) {
        String normalized = StrUtil.blankToDefault(coreAccessStatus, "").trim().toUpperCase(Locale.ROOT);
        if ("OPEN".equals(normalized) || "FULL_ACCESS".equals(normalized) || "CORE_ALLOWED".equals(normalized)) {
            wrapper.eq(AppUser::getFirstLoginCompleted, 1)
                    .notIn(AppUser::getAccountStatus,
                            AccountStatusEnum.FROZEN.getCode(), AccountStatusEnum.CANCELLED.getCode(),
                            AccountStatusEnum.CANCELLING.getCode())
                    .exists(effectiveExistsSql(AppUserAuditTypeEnum.REAL_NAME))
                    .exists(latestStatusExistsSql(AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.APPROVED.getCode()))
                    .exists(effectiveExistsSql(AppUserAuditTypeEnum.EDUCATION));
            applyAccessAgeFilter(wrapper);
        } else if ("BLOCKED".equals(normalized)) {
            wrapper.and(w -> w.isNull(AppUser::getFirstLoginCompleted)
                    .or().ne(AppUser::getFirstLoginCompleted, 1)
                    .or().in(AppUser::getAccountStatus, AccountStatusEnum.FROZEN.getCode(), AccountStatusEnum.CANCELLED.getCode(),
                            AccountStatusEnum.CANCELLING.getCode())
                    .or().apply(accessAgeOutsideSql()));
        } else if ("PENDING".equals(normalized) || "NON_CORE_ONLY".equals(normalized)
                || "BROWSE_ONLY".equals(normalized) || "CORE_PENDING".equals(normalized)) {
            wrapper.notIn(AppUser::getAccountStatus, AccountStatusEnum.FROZEN.getCode(), AccountStatusEnum.CANCELLED.getCode(),
                            AccountStatusEnum.CANCELLING.getCode())
                    .and(w -> w.isNull(AppUser::getFirstLoginCompleted)
                            .or().ne(AppUser::getFirstLoginCompleted, 1)
                            .or().apply(accessAgeOutsideSql())
                            .or().notExists(effectiveExistsSql(AppUserAuditTypeEnum.REAL_NAME))
                            .or().notExists(latestStatusExistsSql(AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.APPROVED.getCode()))
                            .or().notExists(effectiveExistsSql(AppUserAuditTypeEnum.EDUCATION)));
        }
    }

    private void applyAccessAgeFilter(LambdaQueryWrapper<AppUser> wrapper) {
        wrapper.and(w -> w.apply(accessAgeAllowedSql()));
    }

    private String accessAgeAllowedSql() {
        int[] range = accessAgeRange();
        int minAge = range[0];
        int maxAge = range[1];
        return "((birthday IS NOT NULL AND TIMESTAMPDIFF(YEAR, birthday, CURDATE()) BETWEEN " + minAge + " AND " + maxAge + ")"
                + " OR (birthday IS NULL AND (age IS NULL OR age BETWEEN " + minAge + " AND " + maxAge + ")))";
    }

    private String accessAgeOutsideSql() {
        int[] range = accessAgeRange();
        int minAge = range[0];
        int maxAge = range[1];
        return "((birthday IS NOT NULL AND (TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < " + minAge
                + " OR TIMESTAMPDIFF(YEAR, birthday, CURDATE()) > " + maxAge + "))"
                + " OR (birthday IS NULL AND age IS NOT NULL AND (age < " + minAge + " OR age > " + maxAge + ")))";
    }

    private int[] accessAgeRange() {
        Map<String, Object> policy = null;
        try {
            Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot = runtimeConfigResolver.snapshot();
            policy = runtimeConfigResolver.accessPolicy(snapshot);
        } catch (RuntimeException ignored) {
            // 配置异常时使用默认年龄范围，避免管理后台列表不可用。
        }
        int minAge = configInt(policy == null ? null : policy.get("minAge"), 18);
        int maxAge = configInt(policy == null ? null : policy.get("maxAge"), 60);
        if (maxAge < minAge) {
            return new int[]{18, 60};
        }
        return new int[]{minAge, maxAge};
    }

    private int configInt(Object value, int fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private void applyCityFilter(LambdaQueryWrapper<AppUser> wrapper, String city) {
        String normalized = StrUtil.blankToDefault(city, "").trim();
        if (StrUtil.isBlank(normalized)) {
            return;
        }
        if (normalized.matches("\\d+")) {
            wrapper.eq(AppUser::getLocationCity, normalized);
        } else {
            wrapper.like(AppUser::getLocationCity, normalized);
        }
    }

    private void applyRelationshipAccessFilter(LambdaQueryWrapper<AppUser> wrapper, String relationshipAccess) {
        String normalized = StrUtil.blankToDefault(relationshipAccess, "").trim().toUpperCase(Locale.ROOT);
        if ("OPEN".equals(normalized)) {
            applyCoreAccessFilter(wrapper, "CORE_ALLOWED");
        } else if ("CLOSED".equals(normalized)) {
            applyCoreAccessFilter(wrapper, "CORE_PENDING");
        } else if ("ABNORMAL".equals(normalized)) {
            wrapper.in(AppUser::getAccountStatus,
                    AccountStatusEnum.FROZEN.getCode(), AccountStatusEnum.CANCELLED.getCode(),
                    AccountStatusEnum.CANCELLING.getCode());
        }
    }

    private void applyVipStatusFilter(LambdaQueryWrapper<AppUser> wrapper, String vipStatus) {
        String normalized = StrUtil.blankToDefault(vipStatus, "").trim().toLowerCase(Locale.ROOT);
        if ("active".equals(normalized)) {
            wrapper.exists(vipStatusExistsSql("active")
                    + " AND (ua.vip_expire_time IS NULL OR ua.vip_expire_time >= NOW())");
        } else if ("expired".equals(normalized)) {
            wrapper.exists("SELECT 1 FROM app_user_asset ua WHERE ua.user_id = app_user.id"
                    + " AND ua.deleted = 0 AND (ua.vip_status = 'expired'"
                    + " OR (ua.vip_status = 'active' AND ua.vip_expire_time < NOW()))");
        } else if ("inactive".equals(normalized)) {
            wrapper.and(w -> w.notExists(vipAnyAssetExistsSql()).or().exists(vipStatusExistsSql("inactive")));
        } else {
            throw new BusinessException("不支持的 VIP 状态筛选值");
        }
    }

    private boolean hasCommercialPermission() {
        UserContext context = UserContextHolder.get();
        // 非 Web 单元测试没有登录上下文，沿用历史完整投影；实际请求始终由 TokenInterceptor 写入上下文。
        return context == null || context.getPermissions() != null
                && context.getPermissions().contains(COMMERCIAL_USER_VIEW);
    }

    private String effectiveVipStatus(UserAsset asset) {
        if (asset == null || StrUtil.isBlank(asset.getVipStatus())) {
            return "inactive";
        }
        if ("active".equals(asset.getVipStatus()) && asset.getVipExpireTime() != null
                && asset.getVipExpireTime().isBefore(LocalDateTime.now())) {
            return "expired";
        }
        return asset.getVipStatus();
    }

    private String vipStatusExistsSql(String vipStatus) {
        return "SELECT 1 FROM app_user_asset ua WHERE ua.user_id = app_user.id"
                + " AND ua.deleted = 0 AND ua.vip_status = '" + escapeSql(vipStatus) + "'";
    }

    private String vipAnyAssetExistsSql() {
        return "SELECT 1 FROM app_user_asset ua WHERE ua.user_id = app_user.id AND ua.deleted = 0";
    }

    private String latestStatusExistsSql(AppUserAuditTypeEnum type, String status) {
        String auditType = escapeSql(type.getCode());
        String safeStatus = escapeSql(status);
        return "SELECT 1 FROM app_user_audit_record ar WHERE ar.user_id = app_user.id"
                + " AND ar.deleted = 0 AND ar.audit_type = '" + auditType + "' AND ar.status = '" + safeStatus + "'"
                + " AND ar.id = (SELECT ar2.id FROM app_user_audit_record ar2"
                + " WHERE ar2.user_id = app_user.id AND ar2.deleted = 0 AND ar2.audit_type = '" + auditType + "'"
                + " ORDER BY ar2.submit_time DESC, ar2.id DESC LIMIT 1)";
    }

    private String effectiveExistsSql(AppUserAuditTypeEnum type) {
        return "SELECT 1 FROM app_user_audit_record ar WHERE ar.user_id = app_user.id"
                + " AND ar.deleted = 0 AND ar.audit_type = '" + escapeSql(type.getCode()) + "'"
                + " AND ar.status = 'APPROVED'";
    }

    private AppUserAuditRecord audit(Map<String, AppUserAuditRecord> audits, AppUserAuditTypeEnum type) {
        return audits == null ? null : audits.get(type.getCode());
    }

    private AppUserAuditRecord latestOf(Map<String, AppUserAuditRecord> audits, AppUserAuditTypeEnum... types) {
        AppUserAuditRecord latest = null;
        for (AppUserAuditTypeEnum type : types) {
            AppUserAuditRecord record = audit(audits, type);
            if (record != null && (latest == null
                    || record.getSubmitTime().isAfter(latest.getSubmitTime())
                    || (record.getSubmitTime().isEqual(latest.getSubmitTime()) && record.getId() > latest.getId()))) {
                latest = record;
            }
        }
        return latest;
    }

    private boolean tripleApproved(Map<String, AppUserAuditRecord> audits) {
        return effectiveApproved(audit(audits, AppUserAuditTypeEnum.REAL_NAME))
                && latestApproved(audit(audits, AppUserAuditTypeEnum.AVATAR))
                && effectiveApproved(audit(audits, AppUserAuditTypeEnum.EDUCATION));
    }

    private boolean tripleApproved(Map<String, AppUserAuditRecord> audits, Set<String> effectiveAuditTypes) {
        return effectiveAuditTypes.contains(AppUserAuditTypeEnum.REAL_NAME.getCode())
                && latestApproved(audit(audits, AppUserAuditTypeEnum.AVATAR))
                && effectiveAuditTypes.contains(AppUserAuditTypeEnum.EDUCATION.getCode());
    }

    private int verifyLevel(Map<String, AppUserAuditRecord> audits) {
        int level = 0;
        if (effectiveApproved(audit(audits, AppUserAuditTypeEnum.REAL_NAME))) level++;
        if (latestApproved(audit(audits, AppUserAuditTypeEnum.AVATAR))) level++;
        if (effectiveApproved(audit(audits, AppUserAuditTypeEnum.EDUCATION))) level++;
        return level;
    }

    private boolean effectiveApproved(AppUserAuditRecord record) {
        return record != null
                && AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus());
    }

    private boolean latestApproved(AppUserAuditRecord record) {
        return record != null && AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus());
    }

    private String statusOf(AppUserAuditRecord record) {
        return record == null ? "NOT_SUBMITTED" : record.getStatus();
    }

    private String reason(AppUserAuditRecord record) {
        if (record == null) {
            return null;
        }
        return StrUtil.blankToDefault(record.getRejectReason(), record.getExpiredReason());
    }

    private String formatSubmitTime(AppUserAuditRecord record) {
        return record == null || record.getSubmitTime() == null ? null : record.getSubmitTime().format(FMT);
    }

    private String label(Map<String, String> labels, String code) {
        if (StrUtil.isBlank(code)) {
            return "-";
        }
        Map<String, String> safeLabels = labels == null ? Map.of() : labels;
        return safeLabels.getOrDefault(code, code);
    }

    private String regionLabel(ProfileLabels labels, String code) {
        return StrUtil.isBlank(code) ? "" : label(labels.region(), code);
    }

    private String maskWechat(String wechatId) {
        if (StrUtil.isBlank(wechatId)) {
            return "-";
        }
        String value = wechatId.trim();
        if (value.length() <= 4) {
            return value.charAt(0) + "***";
        }
        if (value.startsWith("wx_") && value.length() > 5) {
            return "wx_****" + value.substring(value.length() - 2);
        }
        return value.substring(0, 2) + "****" + value.substring(value.length() - 2);
    }

    private String toLabelJsonArray(String raw, Map<String, String> labels) {
        List<String> values = splitArrayValue(raw);
        if (values.isEmpty()) {
            return "[]";
        }
        List<String> translated = values.stream()
                .map(value -> labels.getOrDefault(value, value))
                .toList();
        return toJsonArray(translated);
    }

    private List<String> splitArrayValue(String raw) {
        if (StrUtil.isBlank(raw)) {
            return List.of();
        }
        String normalized = raw.trim();
        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        if (StrUtil.isBlank(normalized)) {
            return List.of();
        }
        return java.util.Arrays.stream(normalized.split(","))
                .map(item -> item.replace("\"", "").replace("'", "").trim())
                .filter(StrUtil::isNotBlank)
                .toList();
    }

    private boolean canBrowse(AppUser user) {
        return user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1
                && !AccountStatusEnum.FROZEN.getCode().equals(user.getAccountStatus())
                && !AccountStatusEnum.CANCELLED.getCode().equals(user.getAccountStatus());
    }

    private String blockedReason(AppUser user) {
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() != 1) {
            return "请先完成资料初始化";
        }
        return "账号状态异常";
    }

    private String phoneFromOpenid(String openid) {
        return StrUtil.isNotBlank(openid) && openid.startsWith("phone_") ? openid.substring("phone_".length()) : null;
    }

    private String firstNotBlank(String first, String second) {
        return StrUtil.isNotBlank(first) ? first : second;
    }

    private long countOrZero(Long value) {
        return value == null ? 0L : value;
    }

    /** 每个列表/详情请求只读取一次四类字典，避免按用户逐字段查询。 */
    private ProfileLabels loadProfileLabels() {
        return new ProfileLabels(
                profileDictionaryService.labels(ProfileDictType.GENDER),
                profileDictionaryService.labels(ProfileDictType.IDENTITY),
                profileDictionaryService.labels(ProfileDictType.EDUCATION_LEVEL),
                profileDictionaryService.labels(ProfileDictType.INDUSTRY),
                profileDictionaryService.labels(ProfileDictType.OCCUPATION),
                profileDictionaryService.labels(ProfileDictType.ANNUAL_INCOME),
                profileDictionaryService.labels(ProfileDictType.MARITAL_STATUS),
                profileDictionaryService.labels(ProfileDictType.DATING_GOAL),
                profileDictionaryService.labels(ProfileDictType.EMOTIONAL_STATUS),
                profileDictionaryService.labels(ProfileDictType.PROFILE_TAG),
                profileDictionaryService.labels(ProfileDictType.CHINA_REGION));
    }

    /** 列表页只加载当前页实际出现的字典 code，尤其避免中国大陆地区字典全量加载拖慢分页。 */
    private ProfileLabels loadProfileLabels(Collection<AppUser> users) {
        return new ProfileLabels(
                profileDictionaryService.labels(ProfileDictType.GENDER, collectCodes(users, AppUser::getGender)),
                profileDictionaryService.labels(ProfileDictType.IDENTITY, collectCodes(users, AppUser::getIdentity)),
                profileDictionaryService.labels(ProfileDictType.EDUCATION_LEVEL, collectCodes(users, AppUser::getEducationLevel)),
                profileDictionaryService.labels(ProfileDictType.INDUSTRY, collectCodes(users, AppUser::getIndustry)),
                profileDictionaryService.labels(ProfileDictType.OCCUPATION, collectCodes(users, AppUser::getOccupation)),
                profileDictionaryService.labels(ProfileDictType.ANNUAL_INCOME, collectCodes(users, AppUser::getAnnualIncome)),
                profileDictionaryService.labels(ProfileDictType.MARITAL_STATUS, collectCodes(users, AppUser::getMaritalStatus)),
                profileDictionaryService.labels(ProfileDictType.DATING_GOAL, collectCodes(users, AppUser::getDatingGoal)),
                profileDictionaryService.labels(ProfileDictType.EMOTIONAL_STATUS, collectCodes(users, AppUser::getEmotionalStatus)),
                profileDictionaryService.labels(ProfileDictType.PROFILE_TAG, collectTagCodes(users)),
                profileDictionaryService.labels(ProfileDictType.CHINA_REGION, collectRegionCodes(users)));
    }

    private Set<String> collectCodes(Collection<AppUser> users, Function<AppUser, String> getter) {
        if (users == null || users.isEmpty()) {
            return Set.of();
        }
        Set<String> codes = new LinkedHashSet<>();
        for (AppUser user : users) {
            if (user == null) {
                continue;
            }
            String value = getter.apply(user);
            if (StrUtil.isNotBlank(value)) {
                codes.add(value.trim());
            }
        }
        return codes;
    }

    private Set<String> collectTagCodes(Collection<AppUser> users) {
        if (users == null || users.isEmpty()) {
            return Set.of();
        }
        Set<String> codes = new LinkedHashSet<>();
        for (AppUser user : users) {
            if (user != null) {
                codes.addAll(splitArrayValue(user.getTags()));
            }
        }
        return codes;
    }

    private Set<String> collectRegionCodes(Collection<AppUser> users) {
        if (users == null || users.isEmpty()) {
            return Set.of();
        }
        Set<String> codes = new LinkedHashSet<>();
        for (AppUser user : users) {
            if (user == null) {
                continue;
            }
            addIfNotBlank(codes, user.getLocationProvince());
            addIfNotBlank(codes, user.getLocationCity());
            addIfNotBlank(codes, user.getLocationDistrict());
            addIfNotBlank(codes, user.getHometownProvince());
            addIfNotBlank(codes, user.getHometownCity());
            addIfNotBlank(codes, user.getHometownDistrict());
        }
        return codes;
    }

    private void addIfNotBlank(Set<String> codes, String value) {
        if (StrUtil.isNotBlank(value)) {
            codes.add(value.trim());
        }
    }

    private String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "''");
    }

    private record ProfileLabels(
            Map<String, String> gender,
            Map<String, String> identity,
            Map<String, String> educationLevel,
            Map<String, String> industry,
            Map<String, String> occupation,
            Map<String, String> annualIncome,
            Map<String, String> maritalStatus,
            Map<String, String> datingGoal,
            Map<String, String> emotionalStatus,
            Map<String, String> profileTag,
            Map<String, String> region) {
    }

    private record UserAuditFacts(
            Map<String, AppUserAuditRecord> latestAudits,
            Set<String> effectiveAuditTypes,
            Set<String> effectiveProfileQaQuestionKeys,
            List<String> ownerAlbumPhotos) {

        private static UserAuditFacts empty() {
            return new UserAuditFacts(Map.of(), Set.of(), Set.of(), List.of());
        }

        private String publicAvatar() {
            AppUserAuditRecord avatar = latestAudits.get(AppUserAuditTypeEnum.AVATAR.getCode());
            if (avatar == null
                    || !AppUserAuditStatusEnum.APPROVED.getCode().equals(avatar.getStatus())
                    || StrUtil.isBlank(avatar.getMediaUrl())) {
                return null;
            }
            return avatar.getMediaUrl();
        }
    }

    private record AuditPageData(Map<Long, UserAuditFacts> byUser) {

        private static AuditPageData empty() {
            return new AuditPageData(Map.of());
        }

        private static AuditPageData from(List<AppUserAuditRecord> records) {
            Map<Long, MutableAuditFacts> mutable = new LinkedHashMap<>();
            for (AppUserAuditRecord record : records) {
                if (record.getUserId() == null || StrUtil.isBlank(record.getAuditType())) {
                    continue;
                }
                MutableAuditFacts facts = mutable.computeIfAbsent(record.getUserId(), ignored -> new MutableAuditFacts());
                facts.latestAudits.putIfAbsent(record.getAuditType(), record);
                if (AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus())) {
                    facts.effectiveAuditTypes.add(record.getAuditType());
                    if (AppUserAuditTypeEnum.PROFILE_QA.getCode().equals(record.getAuditType())) {
                        String questionKey = Prd01ProfileCompletenessCalculator.questionKey(record.getMaterialJson());
                        if (StrUtil.isNotBlank(questionKey)) {
                            facts.effectiveProfileQaQuestionKeys.add(questionKey);
                        }
                    }
                }
                if (AppUserAuditTypeEnum.ALBUM_PHOTO.getCode().equals(record.getAuditType())
                        && record.getStatus() != null
                        && !AppUserAuditStatusEnum.EXPIRED.getCode().equals(record.getStatus())
                        && StrUtil.isNotBlank(record.getMediaUrl())) {
                    facts.albumRecords.add(record);
                }
            }

            Comparator<AppUserAuditRecord> albumOrder = Comparator
                    .comparing(AppUserAuditRecord::getSubmitTime,
                            Comparator.nullsFirst(Comparator.naturalOrder()))
                    .thenComparing(AppUserAuditRecord::getId,
                            Comparator.nullsFirst(Comparator.naturalOrder()));
            Map<Long, UserAuditFacts> result = new LinkedHashMap<>();
            mutable.forEach((userId, facts) -> {
                facts.albumRecords.sort(albumOrder);
                List<String> albumPhotos = facts.albumRecords.stream()
                        .map(AppUserAuditRecord::getMediaUrl)
                        .toList();
                result.put(userId, new UserAuditFacts(
                        Map.copyOf(facts.latestAudits),
                        Set.copyOf(facts.effectiveAuditTypes),
                        Set.copyOf(facts.effectiveProfileQaQuestionKeys),
                        List.copyOf(albumPhotos)));
            });
            return new AuditPageData(Map.copyOf(result));
        }

        private UserAuditFacts factsFor(Long userId) {
            return byUser.getOrDefault(userId, UserAuditFacts.empty());
        }

        private Map<Long, Map<String, AppUserAuditRecord>> latestByUser() {
            Map<Long, Map<String, AppUserAuditRecord>> result = new HashMap<>();
            byUser.forEach((userId, facts) -> result.put(userId, facts.latestAudits()));
            return result;
        }
    }

    private static final class MutableAuditFacts {
        private final Map<String, AppUserAuditRecord> latestAudits = new HashMap<>();
        private final Set<String> effectiveAuditTypes = new HashSet<>();
        private final Set<String> effectiveProfileQaQuestionKeys = new HashSet<>();
        private final List<AppUserAuditRecord> albumRecords = new ArrayList<>();
    }
}

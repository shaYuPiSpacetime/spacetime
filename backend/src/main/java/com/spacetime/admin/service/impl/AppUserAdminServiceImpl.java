package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.ImportBatchVO;
import com.spacetime.admin.dto.response.AppUserListVO;
import com.spacetime.admin.dto.response.AppUserStatsVO;
import com.spacetime.admin.dto.response.VerificationDetailVO;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImportBatchDao;
import com.spacetime.common.dao.AppUserImportRowDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.AppUserImportBatch;
import com.spacetime.common.entity.AppUserImportRow;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.Prd01ProfileCompletenessCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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
    private static final List<String> LIST_AUDIT_TYPES = List.of(
            AppUserAuditTypeEnum.REAL_NAME.getCode(),
            AppUserAuditTypeEnum.EDUCATION.getCode(),
            AppUserAuditTypeEnum.AVATAR.getCode(),
            AppUserAuditTypeEnum.ALBUM_PHOTO.getCode(),
            AppUserAuditTypeEnum.PROFILE_BG.getCode(),
            AppUserAuditTypeEnum.ABOUT_ME.getCode(),
            AppUserAuditTypeEnum.HOPE_THEY_KNOW.getCode(),
            AppUserAuditTypeEnum.PROFILE_QA.getCode(),
            AppUserAuditTypeEnum.VOICE_INTRO.getCode());

    private final AppUserDao appUserDao;
    private final AppUserAuditRecordDao auditRecordDao;
    private final AppUserImportBatchDao importBatchDao;
    private final AppUserImportRowDao importRowDao;
    private final ContentOperationLogDao contentOperationLogDao;
    private final ProfileDictionaryService profileDictionaryService;
    private final AppUserAuditContentService auditContentService;
    private final Prd01ProfileCompletenessCalculator profileCompletenessCalculator;

    @Override
    public Page<AppUserListVO> getUserPage(AppUserPageReq req) {
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
                .like(StrUtil.isNotBlank(req.getCity()), AppUser::getLocationCity, req.getCity())
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
        Page<AppUser> page = appUserDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);

        Page<AppUserListVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        List<Long> userIds = page.getRecords().stream().map(AppUser::getId).toList();
        if (userIds.isEmpty()) {
            result.setRecords(List.of());
            return result;
        }

        // 当前页所有审核事实只查询一次；头像、相册、状态和完整度均从同一批结果派生。
        AuditPageData auditPageData = loadAuditPageData(userIds);
        Prd01ProfileCompletenessCalculator.ProfileCompletenessRules completenessRules =
                profileCompletenessCalculator.loadRules();
        ProfileLabels profileLabels = loadProfileLabels();

        result.setRecords(page.getRecords().stream()
                .map(user -> {
                    UserAuditFacts facts = auditPageData.factsFor(user.getId());
                    return toListVO(user, facts.latestAudits(), profileLabels,
                            facts.publicAvatar(), facts.ownerAlbumPhotos(), completenessRules,
                            facts.effectiveAuditTypes());
                })
                .toList());
        return result;
    }

    @Override
    public AppUserStatsVO getUserStats() {
        AppUserStatsVO stats = new AppUserStatsVO();
        stats.setCurrentUserCount(countOrZero(appUserDao.count(new LambdaQueryWrapper<>())));

        LambdaQueryWrapper<AppUser> coreAllowed = new LambdaQueryWrapper<>();
        applyCoreAccessFilter(coreAllowed, "CORE_ALLOWED");
        stats.setCoreAccessAllowedCount(countOrZero(appUserDao.count(coreAllowed)));
        return stats;
    }

    @Override
    public AppUserDetailVO getUserDetail(Long id) {
        AppUser user = appUserDao.selectById(id);
        if (user == null) throw new BusinessException("用户不存在");
        return toDetailVO(user, loadLatestAuditMap(List.of(id)).get(id), loadProfileLabels());
    }

    @Override
    @Transactional
    public void updateUserStatus(Long id, String status) {
        if (AccountStatusEnum.getByCode(status) == null) {
            throw new BusinessException("不支持的用户状态");
        }
        AppUser user = appUserDao.selectById(id);
        if (user == null) throw new BusinessException("用户不存在");
        user.setAccountStatus(status);
        appUserDao.updateById(user);
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
        for (ImportRowResult rowResult : counter.rows()) {
            AppUserImportRow row = new AppUserImportRow();
            row.setBatchId(batchId);
            row.setRowNo(rowResult.rowNo());
            row.setRawJson(rowResult.rawJson());
            row.setStatus(rowResult.status());
            row.setErrorMsg(rowResult.errorMsg());
            importRowDao.insert(row);
        }

        writeLog("PRD01_APP_USER_IMPORT", null, "PRECHECK", null,
                "batchNo=" + batchNo + ", success=" + counter.success() + ", fail=" + counter.fail());

        ImportBatchVO vo = new ImportBatchVO();
        vo.setBatchNo(batchNo);
        vo.setFileName(fileName);
        vo.setTotalCount(counter.total());
        vo.setSuccessCount(counter.success());
        vo.setFailCount(counter.fail());
        vo.setDuplicateCount(counter.duplicate());
        vo.setStatus("PRECHECKED");
        vo.setErrorSummaryJson(errorSummary);
        vo.setMessage("导入预校验完成，请确认后再入库");
        vo.setCreateTime(LocalDateTime.now());
        return vo;
    }

    @Override
    public ExportTaskVO exportFixedFields(AppUserPageReq req, boolean confirmNoMask) {
        if (!confirmNoMask) {
            throw new BusinessException("EXPORT_CONFIRM_REQUIRED: 固定字段不掩码导出必须二次确认");
        }
        String taskNo = "APP-USER-EXPORT-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
        writeLog("PRD01_APP_USER_EXPORT", null, "CREATE", null,
                "taskNo=" + taskNo + ", keyword=" + (req == null ? "" : req.getKeyword()));

        ExportTaskVO vo = new ExportTaskVO();
        vo.setTaskNo(taskNo);
        vo.setExportType("APP_USER_FIXED_FIELDS");
        vo.setStatus("CREATED");
        vo.setMessage("App 用户固定字段导出任务已创建，字段按 PRD 固定口径输出");
        vo.setCreateTime(LocalDateTime.now());
        return vo;
    }

    private AppUserListVO toListVO(AppUser user, Map<String, AppUserAuditRecord> audits, ProfileLabels labels,
            String avatarUrl, List<String> albumPhotos,
            Prd01ProfileCompletenessCalculator.ProfileCompletenessRules completenessRules,
            Set<String> effectiveAuditTypes) {
        AppUserListVO vo = new AppUserListVO();
        AppUserAuditRecord realName = audit(audits, AppUserAuditTypeEnum.REAL_NAME);
        AppUserAuditRecord education = audit(audits, AppUserAuditTypeEnum.EDUCATION);
        AppUserAuditRecord avatar = audit(audits, AppUserAuditTypeEnum.AVATAR);
        AppUserAuditRecord voice = audit(audits, AppUserAuditTypeEnum.VOICE_INTRO);
        vo.setId(user.getId());
        vo.setAvatar(avatarUrl);
        vo.setNickname(user.getNickname());
        vo.setGender(user.getGender());
        vo.setAge(user.getAge());
        vo.setSchool(user.getSchool());
        vo.setPhone(maskPhone(firstNotBlank(realName == null ? null : realName.getBoundPhone(), phoneFromOpenid(user.getOpenid()))));
        vo.setCity(joinLocation(user.getLocationProvince(), user.getLocationCity()));
        vo.setIdentity(profileDictionaryService.label(labels.identity(), user.getIdentity()));
        vo.setOccupation(profileDictionaryService.label(labels.occupation(), user.getOccupation()));
        vo.setAnnualIncome(profileDictionaryService.label(labels.annualIncome(), user.getAnnualIncome()));
        vo.setTags(user.getTags());
        vo.setPhotos(toJsonArray(albumPhotos));
        vo.setVoiceIntroDuration(voice == null ? null : voice.getDuration());
        vo.setVoiceIntroAuditStatus(statusOf(voice));
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted());
        vo.setProfileScore(profileCompletenessCalculator.calculate(
                user, completenessRules, audits, effectiveAuditTypes));
        vo.setAccountStatus(user.getAccountStatus());
        vo.setRegisterTime(user.getRegisterTime() != null ? user.getRegisterTime().format(FMT) : null);
        vo.setLastLoginTime(user.getLastLoginTime() != null ? user.getLastLoginTime().format(FMT) : null);
        vo.setRealNameStatus(statusOf(realName));
        vo.setEducationStatus(statusOf(education));
        vo.setAvatarVerifyStatus(statusOf(avatar));
        vo.setAccessStatus(computeAccessStatusLabel(user, audits, effectiveAuditTypes));
        return vo;
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
            if (error == null) {
                success++;
                rows.add(new ImportRowResult(rowNo, rawJson, "VALID", null));
            } else {
                errors.add("第" + rowNo + "行：" + error);
                rows.add(new ImportRowResult(rowNo, rawJson, "INVALID", error));
            }
        }
        return new ImportCounter(lines.size() - 1, success, errors.size(), duplicate, errors, rows);
    }

    private String cell(String[] cells, int index) {
        return index < cells.length ? cells[index].trim() : "";
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

    private record ImportRowResult(int rowNo, String rawJson, String status, String errorMsg) {
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

    private AppUserDetailVO toDetailVO(AppUser user, Map<String, AppUserAuditRecord> audits, ProfileLabels labels) {
        AppUserAuditRecord realName = audit(audits, AppUserAuditTypeEnum.REAL_NAME);
        AppUserAuditRecord education = audit(audits, AppUserAuditTypeEnum.EDUCATION);
        AppUserAuditRecord avatar = audit(audits, AppUserAuditTypeEnum.AVATAR);
        AppUserAuditRecord media = latestOf(audits, AppUserAuditTypeEnum.ALBUM_PHOTO, AppUserAuditTypeEnum.PROFILE_BG);
        AppUserAuditRecord text = latestOf(audits, AppUserAuditTypeEnum.ABOUT_ME,
                AppUserAuditTypeEnum.HOPE_THEY_KNOW, AppUserAuditTypeEnum.PROFILE_QA);
        AppUserAuditRecord voice = audit(audits, AppUserAuditTypeEnum.VOICE_INTRO);
        AppUserDetailVO vo = new AppUserDetailVO();
        vo.setId(user.getId());
        vo.setNickname(user.getNickname());
        vo.setAvatar(auditContentService.publicAvatar(user.getId()));
        vo.setGender(user.getGender());
        vo.setBirthday(user.getBirthday() != null ? user.getBirthday().toString() : null);
        vo.setAge(user.getAge());
        vo.setHeight(user.getHeight());
        vo.setWeight(user.getWeight());
        vo.setIdentity(profileDictionaryService.label(labels.identity(), user.getIdentity()));
        vo.setOccupation(profileDictionaryService.label(labels.occupation(), user.getOccupation()));
        vo.setAnnualIncome(profileDictionaryService.label(labels.annualIncome(), user.getAnnualIncome()));
        vo.setLocationProvince(user.getLocationProvince());
        vo.setLocationCity(user.getLocationCity());
        vo.setHometownProvince(user.getHometownProvince());
        vo.setHometownCity(user.getHometownCity());
        vo.setSchool(user.getSchool());
        vo.setPhone(maskPhone(firstNotBlank(realName == null ? null : realName.getBoundPhone(), phoneFromOpenid(user.getOpenid()))));
        vo.setMajor(user.getMajor());
        vo.setEducationLevel(profileDictionaryService.label(labels.educationLevel(), user.getEducationLevel()));
        vo.setEmotionalStatus(user.getEmotionalStatus());
        vo.setDatingGoal(user.getDatingGoal());
        vo.setMaritalStatus(user.getMaritalStatus());
        vo.setAboutMe(auditContentService.ownerText(user.getId(), AppUserAuditTypeEnum.ABOUT_ME));
        vo.setHopeTheyKnow(auditContentService.ownerText(user.getId(), AppUserAuditTypeEnum.HOPE_THEY_KNOW));
        vo.setTags(user.getTags());
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
        return AuditPageData.from(records);
    }

    private void applyCoreAccessFilter(LambdaQueryWrapper<AppUser> wrapper, String coreAccessStatus) {
        String normalized = StrUtil.blankToDefault(coreAccessStatus, "").trim().toUpperCase(Locale.ROOT);
        if ("OPEN".equals(normalized) || "FULL_ACCESS".equals(normalized) || "CORE_ALLOWED".equals(normalized)) {
            wrapper.eq(AppUser::getFirstLoginCompleted, 1)
                    .notIn(AppUser::getAccountStatus,
                            AccountStatusEnum.FROZEN.getCode(), AccountStatusEnum.CANCELLED.getCode())
                    .exists(effectiveExistsSql(AppUserAuditTypeEnum.REAL_NAME))
                    .exists(latestStatusExistsSql(AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.APPROVED.getCode()))
                    .exists(effectiveExistsSql(AppUserAuditTypeEnum.EDUCATION));
        } else if ("BLOCKED".equals(normalized)) {
            wrapper.and(w -> w.isNull(AppUser::getFirstLoginCompleted)
                    .or().ne(AppUser::getFirstLoginCompleted, 1)
                    .or().in(AppUser::getAccountStatus, AccountStatusEnum.FROZEN.getCode(), AccountStatusEnum.CANCELLED.getCode()));
        } else if ("PENDING".equals(normalized) || "NON_CORE_ONLY".equals(normalized)
                || "BROWSE_ONLY".equals(normalized) || "CORE_PENDING".equals(normalized)) {
            wrapper.eq(AppUser::getFirstLoginCompleted, 1)
                    .notIn(AppUser::getAccountStatus, AccountStatusEnum.FROZEN.getCode(), AccountStatusEnum.CANCELLED.getCode())
                    .and(w -> w.notExists(effectiveExistsSql(AppUserAuditTypeEnum.REAL_NAME))
                            .or().notExists(latestStatusExistsSql(AppUserAuditTypeEnum.AVATAR, AppUserAuditStatusEnum.APPROVED.getCode()))
                            .or().notExists(effectiveExistsSql(AppUserAuditTypeEnum.EDUCATION)));
        }
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
                profileDictionaryService.labels(ProfileDictType.IDENTITY),
                profileDictionaryService.labels(ProfileDictType.EDUCATION_LEVEL),
                profileDictionaryService.labels(ProfileDictType.OCCUPATION),
                profileDictionaryService.labels(ProfileDictType.ANNUAL_INCOME));
    }

    private String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "''");
    }

    private record ProfileLabels(
            Map<String, String> identity,
            Map<String, String> educationLevel,
            Map<String, String> occupation,
            Map<String, String> annualIncome) {
    }

    private record UserAuditFacts(
            Map<String, AppUserAuditRecord> latestAudits,
            Set<String> effectiveAuditTypes,
            List<String> ownerAlbumPhotos) {

        private static UserAuditFacts empty() {
            return new UserAuditFacts(Map.of(), Set.of(), List.of());
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
        private final List<AppUserAuditRecord> albumRecords = new ArrayList<>();
    }
}

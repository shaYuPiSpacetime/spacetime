package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.ImportBatchVO;
import com.spacetime.admin.dto.response.AppUserListVO;
import com.spacetime.admin.dto.response.VerificationDetailVO;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImportBatchDao;
import com.spacetime.common.dao.AppUserImportRowDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserImportBatch;
import com.spacetime.common.entity.AppUserImportRow;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AccessDecisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
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

    private final AppUserDao appUserDao;
    private final AppUserVerificationDao verificationDao;
    private final AccessDecisionService accessDecisionService;
    private final AppUserImportBatchDao importBatchDao;
    private final AppUserImportRowDao importRowDao;
    private final ContentOperationLogDao contentOperationLogDao;

    @Override
    public Page<AppUserListVO> getUserPage(AppUserPageReq req) {
        String safeKeyword = StrUtil.blankToDefault(req.getKeyword(), "").replace("'", "''");
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<AppUser>()
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w
                        .like(AppUser::getNickname, req.getKeyword())
                        .or().like(AppUser::getSchool, req.getKeyword())
                        .or().like(AppUser::getTags, req.getKeyword())
                        .or().exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id"
                                + " AND (v.real_name LIKE '%" + safeKeyword + "%'"
                                + " OR v.bound_phone LIKE '%" + safeKeyword + "%'"
                                + " OR v.id_card LIKE '%" + safeKeyword + "%')"))
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

        // 认证状态筛选：用 EXISTS 子查询在 SQL 层完成，保证分页准确
        if (StrUtil.isNotBlank(req.getRealNameStatus())) {
            wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.real_name_status = '" + req.getRealNameStatus() + "'");
        }
        if (StrUtil.isNotBlank(req.getEducationStatus())) {
            wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.education_status = '" + req.getEducationStatus() + "'");
        }
        if (StrUtil.isNotBlank(req.getAvatarVerifyStatus())) {
            wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.avatar_verify_status = '" + req.getAvatarVerifyStatus() + "'");
        }
        if (StrUtil.isNotBlank(req.getCoreAccessStatus())) {
            wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.core_access_status = '" + req.getCoreAccessStatus() + "'");
        }
        // Demo 的「认证状态」是聚合筛选，落到三类认证状态字段。
        if (StrUtil.isNotBlank(req.getVerificationStatus())) {
            if ("REAL_NAME_APPROVED".equals(req.getVerificationStatus())) {
                wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.real_name_status = 'APPROVED'");
            } else if ("EDUCATION_APPROVED".equals(req.getVerificationStatus())) {
                wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.education_status = 'APPROVED'");
            } else if ("AVATAR_APPROVED".equals(req.getVerificationStatus())) {
                wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.avatar_verify_status = 'APPROVED'");
            }
        }
        Page<AppUser> page = appUserDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);

        // 批量加载所有用户的认证状态（避免 N+1）
        List<Long> userIds = page.getRecords().stream().map(AppUser::getId).toList();
        Map<Long, AppUserVerification> verifyMap = userIds.isEmpty() ? Map.of() : verificationDao.selectList(
                new LambdaQueryWrapper<AppUserVerification>().in(AppUserVerification::getUserId, userIds))
                .stream().collect(Collectors.toMap(AppUserVerification::getUserId, v -> v, (a, b) -> a));

        Page<AppUserListVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream()
                .map(user -> toListVO(user, verifyMap.get(user.getId())))
                .toList());
        return result;
    }

    @Override
    public AppUserDetailVO getUserDetail(Long id) {
        AppUser user = appUserDao.selectById(id);
        if (user == null) throw new BusinessException("用户不存在");
        AppUserVerification verification = verificationDao.selectOne(
                new LambdaQueryWrapper<AppUserVerification>().eq(AppUserVerification::getUserId, id));
        return toDetailVO(user, verification);
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

    private AppUserListVO toListVO(AppUser user, AppUserVerification v) {
        AppUserListVO vo = new AppUserListVO();
        vo.setId(user.getId());
        vo.setAvatar(user.getAvatar());
        vo.setNickname(user.getNickname());
        vo.setGender(user.getGender());
        vo.setAge(user.getAge());
        vo.setSchool(user.getSchool());
        vo.setPhone(v == null ? null : maskPhone(v.getBoundPhone()));
        vo.setCity(joinLocation(user.getLocationProvince(), user.getLocationCity()));
        vo.setIdentity(user.getIdentity());
        vo.setOccupation(user.getOccupation());
        vo.setAnnualIncome(user.getAnnualIncome());
        vo.setTags(user.getTags());
        vo.setPhotos(user.getPhotos());
        vo.setVoiceIntroDuration(user.getVoiceIntroDuration());
        vo.setVoiceIntroAuditStatus(user.getVoiceIntroAuditStatus());
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted());
        vo.setProfileScore(user.getProfileScore());
        vo.setAccountStatus(user.getAccountStatus());
        vo.setRegisterTime(user.getRegisterTime() != null ? user.getRegisterTime().format(FMT) : null);
        vo.setLastLoginTime(user.getLastLoginTime() != null ? user.getLastLoginTime().format(FMT) : null);
        if (v != null) {
            vo.setRealNameStatus(v.getRealNameStatus());
            vo.setEducationStatus(v.getEducationStatus());
            vo.setAvatarVerifyStatus(v.getAvatarVerifyStatus());
        }
        vo.setAccessStatus(computeAccessStatusLabel(user, v));
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

    /** 计算准入状态标签：账号/首登阻断→blocked，三重认证未全通过→browse_only，全通过→full_access */
    private String computeAccessStatusLabel(AppUser user, AppUserVerification v) {
        var decision = accessDecisionService.decide(user, v);
        if (Boolean.TRUE.equals(decision.getCanMatch()) && Boolean.TRUE.equals(decision.getCanBeExposed())) {
            return "full_access";
        }
        return Boolean.TRUE.equals(decision.getCanBrowseCards()) ? "browse_only" : "blocked";
    }

    private AppUserDetailVO toDetailVO(AppUser user, AppUserVerification v) {
        AppUserDetailVO vo = new AppUserDetailVO();
        vo.setId(user.getId());
        vo.setNickname(user.getNickname());
        vo.setAvatar(user.getAvatar());
        vo.setGender(user.getGender());
        vo.setBirthday(user.getBirthday() != null ? user.getBirthday().toString() : null);
        vo.setAge(user.getAge());
        vo.setHeight(user.getHeight());
        vo.setWeight(user.getWeight());
        vo.setIdentity(user.getIdentity());
        vo.setOccupation(user.getOccupation());
        vo.setAnnualIncome(user.getAnnualIncome());
        vo.setLocationProvince(user.getLocationProvince());
        vo.setLocationCity(user.getLocationCity());
        vo.setHometownProvince(user.getHometownProvince());
        vo.setHometownCity(user.getHometownCity());
        vo.setSchool(user.getSchool());
        vo.setPhone(v == null ? null : maskPhone(v.getBoundPhone()));
        vo.setMajor(user.getMajor());
        vo.setEducationLevel(user.getEducationLevel());
        vo.setEmotionalStatus(user.getEmotionalStatus());
        vo.setDatingGoal(user.getDatingGoal());
        vo.setMaritalStatus(user.getMaritalStatus());
        vo.setAboutMe(user.getAboutMe());
        vo.setHopeTheyKnow(user.getHopeTheyKnow());
        vo.setTags(user.getTags());
        vo.setPhotos(user.getPhotos());
        vo.setProfileBgImage(user.getProfileBgImage());
        vo.setVoiceIntroUrl(user.getVoiceIntroUrl());
        vo.setVoiceIntroDuration(user.getVoiceIntroDuration());
        vo.setVoiceIntroAuditStatus(user.getVoiceIntroAuditStatus());
        vo.setVoiceIntroRejectReason(user.getVoiceIntroRejectReason());
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setProfileScore(user.getProfileScore());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted());
        vo.setRegisterTime(user.getRegisterTime() != null ? user.getRegisterTime().format(FMT) : null);
        vo.setLastLoginTime(user.getLastLoginTime() != null ? user.getLastLoginTime().format(FMT) : null);
        vo.setAccountStatus(user.getAccountStatus());
        var decision = accessDecisionService.decide(user, v);
        vo.setCanBrowseCards(decision.getCanBrowseCards());
        vo.setCanMatch(decision.getCanMatch());
        vo.setCanBeExposed(decision.getCanBeExposed());
        vo.setBlockReason(decision.getBlockReason());
        vo.setViolationCount(0);
        vo.setFeedbackCount(0);
        if (v != null) {
            VerificationDetailVO vd = new VerificationDetailVO();
            vd.setRealNameStatus(v.getRealNameStatus());
            vd.setRealNameRejectReason(v.getRealNameRejectReason());
            vd.setRealNameSubmitTime(v.getRealNameSubmitTime() != null ? v.getRealNameSubmitTime().format(FMT) : null);
            vd.setEducationStatus(v.getEducationStatus());
            vd.setEducationMethod(v.getEducationMethod());
            vd.setEducationRejectReason(v.getEducationRejectReason());
            vd.setEducationSubmitTime(v.getEducationSubmitTime() != null ? v.getEducationSubmitTime().format(FMT) : null);
            vd.setAvatarVerifyStatus(v.getAvatarVerifyStatus());
            vd.setAvatarVerifyRejectReason(v.getAvatarVerifyRejectReason());
            vd.setAvatarVerifySubmitTime(v.getAvatarVerifySubmitTime() != null ? v.getAvatarVerifySubmitTime().format(FMT) : null);
            vd.setProfilePhotoAuditStatus(v.getProfilePhotoAuditStatus());
            vd.setProfilePhotoRejectReason(v.getProfilePhotoRejectReason());
            vd.setOpenTextAuditStatus(v.getOpenTextAuditStatus());
            vd.setOpenTextRejectReason(v.getOpenTextRejectReason());
            vd.setVerifyLevel(v.getVerifyLevel());
            vo.setVerification(vd);
        }
        return vo;
    }
}

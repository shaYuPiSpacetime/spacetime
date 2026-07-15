package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.EducationVerificationProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.RealNameVerificationProvider;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.miniapp.dto.request.EducationSubmitReq;
import com.spacetime.miniapp.dto.request.RealNameSubmitReq;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import com.spacetime.miniapp.dto.response.EducationVerifyDetailVO;
import com.spacetime.miniapp.dto.response.RealNameVerifyDetailVO;
import com.spacetime.miniapp.dto.response.VerificationStatusVO;
import com.spacetime.miniapp.service.VerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * 移动端三重认证服务实现。
 * 三类认证均以统一审核记录为事实来源，不维护认证快照表。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VerificationServiceImpl implements VerificationService {

    private static final DateTimeFormatter DISPLAY_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String NOT_SUBMITTED = "NOT_SUBMITTED";
    private static final String STUDENT = "STUDENT";
    private static final String MAINLAND_GRADUATE = "MAINLAND_GRADUATE";
    private static final String STUDENT_CARD = "STUDENT_CARD";
    private static final String CHSI = "CHSI";
    private static final String DIPLOMA_NO = "DIPLOMA_NO";
    private static final String MATERIAL_UPLOAD = "MATERIAL_UPLOAD";
    private static final String WORKER = "WORKER";
    private static final String PROTECTED_CREDENTIAL_PREFIX = "/miniapp/file/credential/";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final AppUserAuditService auditService;
    private final AppUserDao appUserDao;
    private final ExternalProviderTaskDao externalProviderTaskDao;
    private final RealNameVerificationProvider realNameVerificationProvider;
    private final EducationVerificationProvider educationVerificationProvider;
    private final ProfileDictionaryService profileDictionaryService;
    private final Prd01RuntimeConfigResolver runtimeConfigResolver;
    private final Prd01AccessEvaluator accessEvaluator;

    /** 查询三重认证状态和页面提交守卫。 */
    @Override
    public VerificationStatusVO getStatus(Long userId) {
        return toStatusVO(userId);
    }

    /** 查询实名认证页回显信息；敏感字段只返回脱敏值。 */
    @Override
    public RealNameVerifyDetailVO getRealNameDetail(Long userId) {
        requireUser(userId);
        AppUserAuditRecord record = auditService.latestRecord(userId, AppUserAuditTypeEnum.REAL_NAME);
        RealNameVerifyDetailVO vo = new RealNameVerifyDetailVO();
        vo.setAuditStatus(status(record));
        vo.setAuditSource(record == null ? null : record.getAuditSource());
        vo.setRejectReason(reason(record));
        vo.setSubmitTime(formatTime(record == null ? null : record.getSubmitTime()));
        vo.setCanSubmit(canSubmitRealName(record));
        vo.setRealName(record == null ? null : maskRealName(record.getRealName()));
        vo.setIdCardNo(record == null ? null : maskIdCard(record.getIdCard()));
        return vo;
    }

    /** 查询学历认证页回显信息；学历提交材料直接来自最近一次审核记录快照。 */
    @Override
    public EducationVerifyDetailVO getEducationDetail(Long userId) {
        requireUser(userId);
        AppUserAuditRecord realName = auditService.latestRecord(userId, AppUserAuditTypeEnum.REAL_NAME);
        AppUserAuditRecord education = auditService.latestRecord(userId, AppUserAuditTypeEnum.EDUCATION);
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot configSnapshot = runtimeConfigResolver.snapshot();
        Prd01RuntimeConfigResolver.AuditPolicy auditPolicy = runtimeConfigResolver.auditPolicy(configSnapshot);
        boolean realNameReady = realNameAllowsEducation(realName);
        EducationVerifyDetailVO vo = new EducationVerifyDetailVO();
        vo.setAuditStatus(status(education));
        vo.setAuditSource(education == null ? null : education.getAuditSource());
        vo.setRejectReason(reason(education));
        vo.setSubmitTime(formatTime(education == null ? null : education.getSubmitTime()));
        vo.setCanSubmit(realNameReady && !pendingLike(education));
        vo.setBlockedReason(!realNameReady ? "请先提交实名认证"
                : pendingLike(education) ? "学历认证审核中" : null);
        vo.setEducationSlaHours(auditPolicy.educationSlaHours());
        vo.setEducationSlaText(auditPolicy.educationSlaText());
        vo.setEducationEstimatedCompleteTime(educationEstimatedCompleteTime(
                education, auditPolicy.educationSlaHours()));
        fillEducationSnapshot(vo, education);
        return vo;
    }

    /** 使用姓名、身份证号和账号绑定手机号提交实名认证。 */
    @Override
    @Transactional
    public VerificationStatusVO submitRealName(Long userId, RealNameSubmitReq req) {
        if (req == null || !Boolean.TRUE.equals(req.getSingleCommitmentChecked())) {
            throw new BusinessException("请先勾选单身承诺和认证协议");
        }
        AppUser user = requireUser(userId);
        if (StrUtil.isBlank(user.getPhone())) {
            throw new BusinessException("当前账号未绑定手机号，无法进行实名认证");
        }
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.REAL_NAME);
        if (latest != null && AppUserAuditStatusEnum.isPendingLike(latest.getStatus())) {
            throw new BusinessException("实名认证审核中，请勿重复提交");
        }
        if (latest != null && AppUserAuditStatusEnum.isApproved(latest.getStatus())) {
            throw new BusinessException("已完成实名认证，如需修改请联系客服");
        }

        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(AppUserAuditTypeEnum.REAL_NAME.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setRealName(req.getRealName().trim());
        record.setRealNameHash(sha256(normalize(req.getRealName())));
        record.setIdCard(req.getIdCardNo().trim().toUpperCase(Locale.ROOT));
        record.setIdCardHash(sha256(normalize(req.getIdCardNo())));
        record.setBoundPhone(user.getPhone());
        auditService.submit(record);
        verifyRealNameByProvider(record);
        return toStatusVO(userId);
    }

    /**
     * 提交学历认证。
     * 实名待审核、审核中或已通过均可进入；每次提交只生成一条学历审核记录。
     */
    @Override
    @Transactional
    public VerificationStatusVO submitEducation(Long userId, EducationSubmitReq req) {
        AppUserAuditRecord realName = auditService.latestRecord(userId, AppUserAuditTypeEnum.REAL_NAME);
        if (!realNameAllowsEducation(realName)) {
            throw new BusinessException("请先提交实名认证");
        }
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.EDUCATION);
        if (latest != null && AppUserAuditStatusEnum.isPendingLike(latest.getStatus())) {
            throw new BusinessException("学历认证审核中，请耐心等待");
        }
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot configSnapshot = runtimeConfigResolver.snapshot();
        Prd01RuntimeConfigResolver.UploadRule educationUploadRule =
                runtimeConfigResolver.uploadRule(configSnapshot, "education", 4, 10);
        EducationSubmission submission = validateEducation(req, educationUploadRule.maxCount());
        AppUser user = requireUser(userId);

        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(AppUserAuditTypeEnum.EDUCATION.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setEducationMethod(submission.method());
        record.setSchoolName(req.getSchoolName().trim());
        record.setRealName(StrUtil.blankToDefault(req.getCertificateName(), realName.getRealName()));
        record.setMaterialJson(educationMaterialJson(req, submission, user));
        auditService.submit(record);
        verifyEducationByProvider(record);
        return toStatusVO(userId);
    }

    /**
     * 调用学历核验 Provider，并统一记录三方任务和机审历史。
     * Provider 异常时保留待审核状态，避免丢失本次用户提交。
     */
    private void verifyEducationByProvider(AppUserAuditRecord record) {
        try {
            ProviderCheckResult result = educationVerificationProvider.check(
                    record.getEducationMethod(), record.getSchoolName(), record.getMaterialJson());
            ExternalProviderTask task = educationProviderTask(record, result);
            externalProviderTaskDao.insert(task);
            if (Boolean.TRUE.equals(result.getSafe())) {
                auditService.machineApprove(record.getId(), task.getId(), result.getRawResponseJson());
            } else {
                auditService.machineReject(record.getId(), task.getId(), result.getRawResponseJson(),
                        StrUtil.blankToDefault(result.getRejectReason(), "学历认证核验未通过"));
            }
        } catch (Exception ex) {
            log.warn("学历核验 Provider 调用失败，auditRecordId={}", record.getId(), ex);
        }
    }

    /** 构造学历核验三方任务，后续接入真实学信网或证书核验时沿用该留痕结构。 */
    private ExternalProviderTask educationProviderTask(
            AppUserAuditRecord record, ProviderCheckResult result) {
        ExternalProviderTask task = new ExternalProviderTask();
        task.setProviderType("EDUCATION_VERIFICATION");
        task.setProviderCode(result.getProviderCode());
        task.setUserId(record.getUserId());
        task.setRequestPayloadJson("{\"educationMethod\":\"" + json(record.getEducationMethod())
                + "\",\"schoolName\":\"" + json(record.getSchoolName())
                + "\",\"material\":" + StrUtil.blankToDefault(record.getMaterialJson(), "null") + "}");
        task.setResponsePayloadJson(result.getRawResponseJson());
        task.setTaskStatus(Boolean.TRUE.equals(result.getSafe()) ? "SUCCESS" : "REJECTED");
        task.setMocked(Boolean.TRUE.equals(result.getMocked()) ? 1 : 0);
        task.setErrorMessage(result.getRejectReason());
        return task;
    }

    private void verifyRealNameByProvider(AppUserAuditRecord record) {
        try {
            ProviderCheckResult result = realNameVerificationProvider.check(
                    record.getRealName(), record.getIdCard(), record.getBoundPhone());
            ExternalProviderTask task = realNameProviderTask(record, result);
            externalProviderTaskDao.insert(task);
            if (Boolean.TRUE.equals(result.getSafe())) {
                auditService.machineApprove(record.getId(), task.getId(), result.getRawResponseJson());
            } else {
                auditService.machineReject(record.getId(), task.getId(), result.getRawResponseJson(),
                        StrUtil.blankToDefault(result.getRejectReason(), "实名认证三要素核验未通过"));
            }
        } catch (Exception ignored) {
            // 第三方不可用时保留待审核记录，后台可继续人工审核，不丢失本次提交。
        }
    }

    private ExternalProviderTask realNameProviderTask(AppUserAuditRecord record, ProviderCheckResult result) {
        ExternalProviderTask task = new ExternalProviderTask();
        task.setProviderType("REAL_NAME_VERIFICATION");
        task.setProviderCode(result.getProviderCode());
        task.setUserId(record.getUserId());
        task.setRequestPayloadJson("{\"realName\":\"" + json(maskRealName(record.getRealName()))
                + "\",\"idCardNo\":\"" + json(maskIdCard(record.getIdCard()))
                + "\",\"phone\":\"" + json(maskPhone(record.getBoundPhone())) + "\"}");
        task.setResponsePayloadJson(result.getRawResponseJson());
        task.setTaskStatus(Boolean.TRUE.equals(result.getSafe()) ? "SUCCESS" : "REJECTED");
        task.setMocked(Boolean.TRUE.equals(result.getMocked()) ? 1 : 0);
        task.setErrorMessage(result.getRejectReason());
        return task;
    }

    private EducationSubmission validateEducation(EducationSubmitReq req, int materialMaxCount) {
        if (req == null || !Boolean.TRUE.equals(req.getEducationAgreementChecked())) {
            throw new BusinessException("请先勾选学历认证协议");
        }
        String userType = profileDictionaryService.requireCode(
                ProfileDictType.EDUCATION_USER_TYPE, upper(req.getEducationUserType()), "学历人群");
        String method = profileDictionaryService.requireCode(
                ProfileDictType.EDUCATION_METHOD, upper(req.getEducationMethod()), "学历认证方式");
        if (!STUDENT.equals(userType) && !MAINLAND_GRADUATE.equals(userType)) {
            throw new BusinessException("首版仅支持在校生和中国大陆毕业生学历认证");
        }
        if (StrUtil.isBlank(req.getSchoolName()) || req.getSchoolName().trim().length() < 2
                || req.getSchoolName().trim().length() > 100) {
            throw new BusinessException("学校名称需2-100个字符");
        }
        String educationLevel = profileDictionaryService.requireCode(
                ProfileDictType.EDUCATION_LEVEL, req.getEducationLevel(), "学历");
        List<String> materials = req.getMaterialUrls() == null
                ? List.of()
                : req.getMaterialUrls().stream().map(StrUtil::trim).toList();
        if (materials.size() > materialMaxCount) {
            throw new BusinessException("学历证明材料最多" + materialMaxCount + "张");
        }
        if (materials.stream().anyMatch(url -> !isEducationMaterialUrl(url))) {
            throw new BusinessException("学历证明材料地址无效");
        }

        if (STUDENT.equals(userType)) {
            if (!STUDENT_CARD.equals(method)) {
                throw new BusinessException("在校生只能使用学生证或在读证明认证");
            }
            if (materials.isEmpty()) {
                throw new BusinessException("请上传学生证或在读证明");
            }
        } else {
            validateGraduateMethod(req, method, materials);
        }
        return new EducationSubmission(userType, method, educationLevel, materials);
    }

    /** 学历材料既支持历史公网 URL，也支持 OSS 直传后返回的受保护相对路径。 */
    private boolean isEducationMaterialUrl(String value) {
        if (StrUtil.isBlank(value)) {
            return false;
        }
        if (value.startsWith("https://") || value.startsWith("http://")) {
            return true;
        }
        if (!value.startsWith(PROTECTED_CREDENTIAL_PREFIX)) {
            return false;
        }
        String objectKey = value.substring(PROTECTED_CREDENTIAL_PREFIX.length());
        return StrUtil.isNotBlank(objectKey)
                && !objectKey.startsWith("/")
                && !objectKey.contains("..")
                && objectKey.matches("[A-Za-z0-9._/-]+");
    }

    private void validateGraduateMethod(EducationSubmitReq req, String method, List<String> materials) {
        if (CHSI.equals(method)) {
            if (StrUtil.isBlank(req.getChsiCode()) || !req.getChsiCode().matches("^[A-Za-z0-9]{12,18}$")) {
                throw new BusinessException("学信网在线验证码需为12-18位字母或数字");
            }
            return;
        }
        if (DIPLOMA_NO.equals(method)) {
            requireCertificateName(req.getCertificateName());
            if (StrUtil.isBlank(req.getDiplomaNo()) || req.getDiplomaNo().trim().length() > 64) {
                throw new BusinessException("请填写有效的毕业证或学位证书编号");
            }
            return;
        }
        if (MATERIAL_UPLOAD.equals(method)) {
            requireCertificateName(req.getCertificateName());
            if (materials.isEmpty()) {
                throw new BusinessException("请上传毕业证或学位证书材料");
            }
            return;
        }
        throw new BusinessException("不支持的学历认证方式");
    }

    private void requireCertificateName(String value) {
        if (StrUtil.isBlank(value) || value.trim().length() > 50) {
            throw new BusinessException("请填写与证书一致的姓名");
        }
    }

    private VerificationStatusVO toStatusVO(Long userId) {
        AppUser user = requireUser(userId);
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot configSnapshot = runtimeConfigResolver.snapshot();
        Prd01RuntimeConfigResolver.AuditPolicy auditPolicy = runtimeConfigResolver.auditPolicy(configSnapshot);
        AppUserAuditRecord realName = auditService.latestRecord(userId, AppUserAuditTypeEnum.REAL_NAME);
        AppUserAuditRecord education = auditService.latestRecord(userId, AppUserAuditTypeEnum.EDUCATION);
        AppUserAuditRecord avatar = auditService.latestRecord(userId, AppUserAuditTypeEnum.AVATAR);
        VerificationStatusVO vo = new VerificationStatusVO();
        vo.setRealNameStatus(status(realName));
        vo.setRealNameRejectReason(reason(realName));
        vo.setRealNameSubmitTime(formatTime(realName == null ? null : realName.getSubmitTime()));
        vo.setRealNameCanSubmit(canSubmitRealName(realName));
        vo.setEducationStatus(status(education));
        vo.setEducationRejectReason(reason(education));
        vo.setEducationSubmitTime(formatTime(education == null ? null : education.getSubmitTime()));
        boolean realNameReady = realNameAllowsEducation(realName);
        vo.setEducationCanSubmit(realNameReady && !pendingLike(education));
        vo.setEducationBlockedReason(!realNameReady ? "请先提交实名认证"
                : pendingLike(education) ? "学历认证审核中" : null);
        vo.setEducationSlaHours(auditPolicy.educationSlaHours());
        vo.setEducationSlaText(auditPolicy.educationSlaText());
        vo.setEducationEstimatedCompleteTime(educationEstimatedCompleteTime(education, auditPolicy.educationSlaHours()));
        vo.setAvatarVerifyStatus(status(avatar));
        vo.setAvatarVerifyRejectReason(reason(avatar));
        vo.setAvatarVerifySubmitTime(formatTime(avatar == null ? null : avatar.getSubmitTime()));
        vo.setAvatarCanSubmit(!pendingLike(avatar));
        vo.setProfilePhotoAuditStatus(status(latestOf(userId,
                AppUserAuditTypeEnum.ALBUM_PHOTO, AppUserAuditTypeEnum.PROFILE_BG)));
        vo.setOpenTextAuditStatus(status(latestOf(userId,
                AppUserAuditTypeEnum.ABOUT_ME, AppUserAuditTypeEnum.HOPE_THEY_KNOW,
                AppUserAuditTypeEnum.PROFILE_QA)));
        int verifyLevel = auditService.certificationApprovedCount(userId);
        vo.setVerifyLevel(verifyLevel);
        vo.setUnlockMateRecommend(auditService.hasEffective(userId, AppUserAuditTypeEnum.REAL_NAME));
        AccessStatusVO accessStatus = accessEvaluator.evaluate(user);
        vo.setCoreAccessStatus(accessStatus.getCoreAccessStatus());
        vo.setAccessStatus(accessStatus);
        return vo;
    }

    /** 只有待审核和审核中的学历记录需要向移动端展示预计完成时间。 */
    private String educationEstimatedCompleteTime(AppUserAuditRecord education, int slaHours) {
        if (!pendingLike(education) || education.getSubmitTime() == null) {
            return null;
        }
        return education.getSubmitTime().plusHours(slaHours).format(DISPLAY_TIME_FORMATTER);
    }

    private boolean canSubmitRealName(AppUserAuditRecord record) {
        return record == null || AppUserAuditStatusEnum.REJECTED.getCode().equals(record.getStatus())
                || AppUserAuditStatusEnum.EXPIRED.getCode().equals(record.getStatus());
    }

    private boolean realNameAllowsEducation(AppUserAuditRecord record) {
        return record != null && (AppUserAuditStatusEnum.isPendingLike(record.getStatus())
                || AppUserAuditStatusEnum.isApproved(record.getStatus()));
    }

    private boolean pendingLike(AppUserAuditRecord record) {
        return record != null && AppUserAuditStatusEnum.isPendingLike(record.getStatus());
    }

    private AppUserAuditRecord latestOf(Long userId, AppUserAuditTypeEnum... types) {
        AppUserAuditRecord latest = null;
        for (AppUserAuditTypeEnum type : types) {
            AppUserAuditRecord candidate = auditService.latestRecord(userId, type);
            if (candidate != null && (latest == null || after(candidate.getSubmitTime(), latest.getSubmitTime()))) {
                latest = candidate;
            }
        }
        return latest;
    }

    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    private String educationMaterialJson(EducationSubmitReq req, EducationSubmission submission, AppUser user) {
        return "{\"educationUserType\":\"" + json(submission.userType())
                + "\",\"educationLevel\":\"" + json(submission.educationLevel())
                + "\",\"identity\":\"" + json(identityCodeForEducationUserType(submission.userType(), user.getIdentity()))
                + "\",\"chsiCode\":\"" + json(req.getChsiCode())
                + "\",\"diplomaNo\":\"" + json(req.getDiplomaNo())
                + "\",\"certificateName\":\"" + json(req.getCertificateName())
                + "\",\"materialUrls\":" + jsonArray(submission.materialUrls()) + "}";
    }

    /** 将学历提交快照转成页面可直接回显的字段。 */
    private void fillEducationSnapshot(EducationVerifyDetailVO vo, AppUserAuditRecord record) {
        if (record == null) {
            vo.setMaterialUrls(List.of());
            return;
        }
        JsonNode material = materialNode(record.getMaterialJson());
        String userType = jsonText(material, "educationUserType");
        String identityCode = identityCodeForEducationUserType(userType, jsonText(material, "identity"));
        String educationLevel = jsonText(material, "educationLevel");
        vo.setEducationUserType(userType);
        vo.setEducationUserTypeLabel(educationUserTypeLabel(userType));
        vo.setIdentityCode(identityCode);
        vo.setIdentityLabel(profileDictionaryService.label(ProfileDictType.IDENTITY, identityCode));
        vo.setEducationMethod(record.getEducationMethod());
        vo.setEducationMethodLabel(educationMethodLabel(record.getEducationMethod()));
        vo.setSchoolName(record.getSchoolName());
        vo.setEducationLevel(educationLevel);
        vo.setEducationLevelLabel(profileDictionaryService.label(ProfileDictType.EDUCATION_LEVEL, educationLevel));
        vo.setChsiCode(jsonText(material, "chsiCode"));
        vo.setDiplomaNo(jsonText(material, "diplomaNo"));
        vo.setCertificateName(jsonText(material, "certificateName"));
        vo.setMaterialUrls(jsonTextArray(material, "materialUrls"));
    }

    /** 在线学生映射为在校生；中国大陆毕业生映射为职场人，和基础资料身份共用同一字典。 */
    private String identityCodeForEducationUserType(String userType, String fallbackIdentity) {
        if (STUDENT.equals(userType)) {
            return STUDENT;
        }
        if (MAINLAND_GRADUATE.equals(userType)) {
            return WORKER;
        }
        return fallbackIdentity;
    }

    private String educationUserTypeLabel(String userType) {
        if (STUDENT.equals(userType)) {
            return "在校生";
        }
        if (MAINLAND_GRADUATE.equals(userType)) {
            return "中国大陆毕业生";
        }
        return userType;
    }

    private String educationMethodLabel(String method) {
        if (STUDENT_CARD.equals(method)) {
            return "学生证/在读证明";
        }
        if (CHSI.equals(method)) {
            return "学信网验证码";
        }
        if (DIPLOMA_NO.equals(method)) {
            return "证书编号";
        }
        if (MATERIAL_UPLOAD.equals(method)) {
            return "证书材料";
        }
        return method;
    }

    private JsonNode materialNode(String materialJson) {
        if (StrUtil.isBlank(materialJson)) {
            return OBJECT_MAPPER.createObjectNode();
        }
        try {
            return OBJECT_MAPPER.readTree(materialJson);
        } catch (Exception ignored) {
            return OBJECT_MAPPER.createObjectNode();
        }
    }

    private String jsonText(JsonNode node, String fieldName) {
        JsonNode value = node == null ? null : node.get(fieldName);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return StrUtil.isBlank(text) ? null : text;
    }

    private List<String> jsonTextArray(JsonNode node, String fieldName) {
        JsonNode value = node == null ? null : node.get(fieldName);
        if (value == null || !value.isArray()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        value.forEach(item -> {
            if (item != null && !item.isNull() && StrUtil.isNotBlank(item.asText())) {
                result.add(item.asText());
            }
        });
        return result;
    }

    private String jsonArray(List<String> values) {
        return "[" + values.stream().map(value -> "\"" + json(value) + "\"")
                .reduce((left, right) -> left + "," + right).orElse("") + "]";
    }

    private boolean after(LocalDateTime left, LocalDateTime right) {
        if (left == null) return false;
        return right == null || left.isAfter(right);
    }

    private String status(AppUserAuditRecord record) {
        return record == null ? NOT_SUBMITTED : record.getStatus();
    }

    private String reason(AppUserAuditRecord record) {
        if (record == null) return null;
        return record.getRejectReason() != null ? record.getRejectReason() : record.getExpiredReason();
    }

    private String formatTime(LocalDateTime time) {
        return time == null ? null : DISPLAY_TIME_FORMATTER.format(time);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String upper(String value) {
        return StrUtil.isBlank(value) ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (Exception e) {
            throw new BusinessException("生成哈希失败");
        }
    }

    private String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String maskRealName(String name) {
        if (StrUtil.isBlank(name) || name.length() == 1) return name;
        return name.charAt(0) + "*".repeat(name.length() - 1);
    }

    private String maskIdCard(String idCard) {
        if (StrUtil.isBlank(idCard) || idCard.length() < 8) return idCard;
        return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
    }

    private String maskPhone(String phone) {
        if (StrUtil.isBlank(phone) || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private record EducationSubmission(String userType, String method, String educationLevel,
                                       List<String> materialUrls) {
    }
}

package com.spacetime.common.service;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

/**
 * PRD01 资料完整度实时计算器。
 *
 * <p>后台“资料完整度”配置保存后，移动端资料查询直接按当前配置和审核事实重新计算，不依赖用户主表旧分数。</p>
 */
@Component
@RequiredArgsConstructor
public class Prd01ProfileCompletenessCalculator {

    private static final String STUDENT = "STUDENT";

    private final Prd01RuntimeConfigResolver runtimeConfigResolver;
    private final AppUserAuditService auditService;

    /** 单次请求只加载一次计分规则，供列表中的所有用户复用。 */
    public ProfileCompletenessRules loadRules() {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot = runtimeConfigResolver.snapshot();
        return new ProfileCompletenessRules(runtimeConfigResolver.profileCompleteness(snapshot));
    }

    public int calculate(AppUser user) {
        if (user == null || user.getId() == null) {
            return 0;
        }
        return calculateScore(user, loadRules(), fieldId -> filledFromDao(user, fieldId));
    }

    /** 使用列表已批量加载的审核事实计算，不在逐用户组装阶段访问 DAO。 */
    public int calculate(AppUser user, ProfileCompletenessRules rules,
            Map<String, AppUserAuditRecord> latestAudits, Set<String> effectiveAuditTypes) {
        if (user == null || user.getId() == null || rules == null) {
            return 0;
        }
        Map<String, AppUserAuditRecord> safeLatest = latestAudits == null ? Map.of() : latestAudits;
        Set<String> safeEffective = effectiveAuditTypes == null ? Set.of() : effectiveAuditTypes;
        return calculateScore(user, rules, fieldId -> filledFromFacts(user, fieldId, safeLatest, safeEffective));
    }

    private int calculateScore(AppUser user, ProfileCompletenessRules rules, Predicate<String> filled) {
        Map<String, Object> completeness = rules.completeness();
        Object rawItems = completeness.get("items");
        if (!(rawItems instanceof List<?> items)) {
            return 0;
        }
        boolean student = STUDENT.equalsIgnoreCase(StrUtil.blankToDefault(user.getIdentity(), ""));
        int score = 0;
        for (Object rawItem : items) {
            if (!(rawItem instanceof Map<?, ?> item)) {
                continue;
            }
            String fieldId = String.valueOf(item.get("fieldId"));
            if (!filled.test(fieldId)) {
                continue;
            }
            score += number(item.get(student ? "studentScore" : "workerScore"), 0);
        }
        int configuredTotal = number(completeness.get(student ? "studentTotalScore" : "workerTotalScore"), 100);
        return Math.min(score, configuredTotal);
    }

    private boolean filledFromDao(AppUser user, String fieldId) {
        return switch (fieldId) {
            case "avatarImage", "avatar" -> latestApproved(user.getId(), AppUserAuditTypeEnum.AVATAR);
            case "photos", "albumPhotos" -> hasEffectiveRecords(user.getId(), AppUserAuditTypeEnum.ALBUM_PHOTO);
            case "profileBgImage", "profileBg" -> auditService.latestEffectiveRecord(user.getId(), AppUserAuditTypeEnum.PROFILE_BG) != null;
            case "aboutMe" -> auditService.latestEffectiveRecord(user.getId(), AppUserAuditTypeEnum.ABOUT_ME) != null;
            case "hopeTheyKnow" -> auditService.latestEffectiveRecord(user.getId(), AppUserAuditTypeEnum.HOPE_THEY_KNOW) != null;
            case "qaList", "profileQa" -> auditService.latestEffectiveRecord(user.getId(), AppUserAuditTypeEnum.PROFILE_QA) != null;
            case "voiceIntro", "voiceIntroUrl", "voiceIntroDuration" ->
                    auditService.latestEffectiveRecord(user.getId(), AppUserAuditTypeEnum.VOICE_INTRO) != null;
            default -> filledScalar(user, fieldId);
        };
    }

    private boolean filledFromFacts(AppUser user, String fieldId,
            Map<String, AppUserAuditRecord> latestAudits, Set<String> effectiveAuditTypes) {
        return switch (fieldId) {
            case "avatarImage", "avatar" -> approved(latestAudits.get(AppUserAuditTypeEnum.AVATAR.getCode()));
            case "photos", "albumPhotos" -> effectiveAuditTypes.contains(AppUserAuditTypeEnum.ALBUM_PHOTO.getCode());
            case "profileBgImage", "profileBg" -> effectiveAuditTypes.contains(AppUserAuditTypeEnum.PROFILE_BG.getCode());
            case "aboutMe" -> effectiveAuditTypes.contains(AppUserAuditTypeEnum.ABOUT_ME.getCode());
            case "hopeTheyKnow" -> effectiveAuditTypes.contains(AppUserAuditTypeEnum.HOPE_THEY_KNOW.getCode());
            case "qaList", "profileQa" -> effectiveAuditTypes.contains(AppUserAuditTypeEnum.PROFILE_QA.getCode());
            case "voiceIntro", "voiceIntroUrl", "voiceIntroDuration" ->
                    effectiveAuditTypes.contains(AppUserAuditTypeEnum.VOICE_INTRO.getCode());
            default -> filledScalar(user, fieldId);
        };
    }

    private boolean filledScalar(AppUser user, String fieldId) {
        return switch (fieldId) {
            case "nickname" -> StrUtil.isNotBlank(user.getNickname());
            case "gender" -> StrUtil.isNotBlank(user.getGender());
            case "birthday", "age" -> user.getBirthday() != null || user.getAge() != null;
            case "height" -> user.getHeight() != null;
            case "weight" -> user.getWeight() != null;
            case "locationProvince" -> StrUtil.isNotBlank(user.getLocationProvince());
            case "locationCity" -> StrUtil.isNotBlank(user.getLocationCity());
            case "locationDistrict" -> StrUtil.isNotBlank(user.getLocationDistrict());
            case "hometownProvince" -> StrUtil.isNotBlank(user.getHometownProvince());
            case "hometownCity" -> StrUtil.isNotBlank(user.getHometownCity());
            case "hometownDistrict" -> StrUtil.isNotBlank(user.getHometownDistrict());
            case "residence" -> StrUtil.isNotBlank(user.getLocationProvince()) || StrUtil.isNotBlank(user.getLocationCity());
            case "identity", "identityType" -> StrUtil.isNotBlank(user.getIdentity());
            case "educationLevel" -> StrUtil.isNotBlank(user.getEducationLevel());
            case "industry" -> StrUtil.isNotBlank(user.getIndustry());
            case "occupation" -> StrUtil.isNotBlank(user.getOccupation());
            case "company" -> StrUtil.isNotBlank(user.getCompany());
            case "annualIncome", "annualIncomeRange" -> StrUtil.isNotBlank(user.getAnnualIncome());
            case "school" -> StrUtil.isNotBlank(user.getSchool());
            case "major" -> StrUtil.isNotBlank(user.getMajor());
            case "maritalStatus" -> StrUtil.isNotBlank(user.getMaritalStatus());
            case "emotionalStatus" -> StrUtil.isNotBlank(user.getEmotionalStatus());
            case "datingGoal" -> StrUtil.isNotBlank(user.getDatingGoal());
            case "childrenPlan" -> StrUtil.isNotBlank(user.getChildrenPlan());
            case "wantChild" -> StrUtil.isNotBlank(user.getWantChild());
            case "mbtiType" -> StrUtil.isNotBlank(user.getMbtiType());
            case "tags" -> StrUtil.isNotBlank(user.getTags());
            default -> false;
        };
    }

    private boolean approved(AppUserAuditRecord record) {
        return record != null && AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus());
    }

    private boolean latestApproved(Long userId, AppUserAuditTypeEnum type) {
        AppUserAuditRecord record = auditService.latestRecord(userId, type);
        return record != null && AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus());
    }

    private boolean hasEffectiveRecords(Long userId, AppUserAuditTypeEnum type) {
        List<AppUserAuditRecord> records = auditService.effectiveRecords(userId, type);
        return records != null && !records.isEmpty();
    }

    private int number(Object value, int fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return value == null ? fallback : Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    public record ProfileCompletenessRules(Map<String, Object> completeness) {
        public ProfileCompletenessRules {
            completeness = completeness == null ? Map.of() : completeness;
        }
    }
}

package com.spacetime.common.service.impl;

import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** 关系准入投影实现。 */
@Service
@RequiredArgsConstructor
public class RelationAccessProjectionServiceImpl implements RelationAccessProjectionService {
    private static final String OPEN = "OPEN";
    private static final String CLOSED = "CLOSED";
    private static final String ABNORMAL = "ABNORMAL";

    private final AppUserAuditService auditService;
    private final ProfileScoreConfig profileScoreConfig;
    private final Prd01RuntimeConfigResolver runtimeConfigResolver;

    @Override
    public String project(AppUser user) {
        if (user == null || isAbnormal(user.getAccountStatus())) {
            return ABNORMAL;
        }
        int[] ageRange = accessAgeRange();
        return project(user, auditService.certificationApprovedCount(user.getId()) == 3,
                ageRange[0], ageRange[1]);
    }

    @Override
    public String project(AppUser user, boolean tripleApproved, int minAge, int maxAge) {
        if (user == null || isAbnormal(user.getAccountStatus())) {
            return ABNORMAL;
        }
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() != 1) {
            return CLOSED;
        }
        Integer age = user.getBirthday() == null ? user.getAge() : profileScoreConfig.calculateAge(user.getBirthday());
        if (age != null && (age < minAge || age > maxAge)) {
            return CLOSED;
        }
        return tripleApproved ? OPEN : CLOSED;
    }

    @Override
    public Map<Long, String> projectAll(Collection<AppUser> users) {
        List<AppUser> candidates = users == null ? List.of() : users.stream()
                .filter(Objects::nonNull)
                .filter(user -> user.getId() != null)
                .toList();
        if (candidates.isEmpty()) {
            return Map.of();
        }
        List<Long> userIds = candidates.stream().map(AppUser::getId).distinct().toList();
        Map<Long, Integer> approvedCounts = auditService.certificationApprovedCounts(userIds);
        int[] ageRange = accessAgeRange();
        Map<Long, String> result = new LinkedHashMap<>();
        candidates.forEach(user -> result.put(user.getId(), project(user,
                approvedCounts.getOrDefault(user.getId(), 0) == 3, ageRange[0], ageRange[1])));
        return result;
    }

    private int[] accessAgeRange() {
        try {
            Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot = runtimeConfigResolver.snapshot();
            Map<String, Object> policy = runtimeConfigResolver.accessPolicy(snapshot);
            int minAge = number(policy.get("minAge"), 18);
            int maxAge = number(policy.get("maxAge"), 60);
            return maxAge < minAge ? new int[]{18, 60} : new int[]{minAge, maxAge};
        } catch (RuntimeException ignored) {
            return new int[]{18, 60};
        }
    }

    private int number(Object value, int fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return value == null ? fallback : Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private boolean isAbnormal(String status) {
        return AccountStatusEnum.FROZEN.getCode().equals(status)
                || AccountStatusEnum.CANCELLING.getCode().equals(status)
                || AccountStatusEnum.CANCELLED.getCode().equals(status);
    }
}

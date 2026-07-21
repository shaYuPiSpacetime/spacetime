package com.spacetime.common.service.impl;

import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

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

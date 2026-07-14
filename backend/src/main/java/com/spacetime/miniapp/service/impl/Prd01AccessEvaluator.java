package com.spacetime.miniapp.service.impl;

import com.spacetime.common.config.ProfileScoreConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.miniapp.dto.response.AccessStatusVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * PRD01 准入能力统一评估器。
 *
 * <p>登录、资料页、认证状态页都从这里派生准入结果，避免年龄、账号状态、首登状态和三重认证在多个接口里各算一套。</p>
 */
@Component
@RequiredArgsConstructor
public class Prd01AccessEvaluator {

    private final ProfileScoreConfig scoreConfig;
    private final AppUserAuditService auditService;
    private final Prd01RuntimeConfigResolver runtimeConfigResolver;

    public AccessStatusVO evaluate(AppUser user) {
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot = runtimeConfigResolver.snapshot();
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() != 1) {
            return blocked(false, runtimeConfigResolver.copyText(snapshot,
                    "core_access_profile_incomplete", "请先完善基础资料后继续使用"));
        }
        if (AccountStatusEnum.FROZEN.getCode().equals(user.getAccountStatus())
                || AccountStatusEnum.CANCELLED.getCode().equals(user.getAccountStatus())) {
            return blocked(false, runtimeConfigResolver.copyText(snapshot,
                    "core_access_account_abnormal", "账号状态异常，暂无法使用该功能，请联系客服"));
        }
        if (ageOutsidePolicy(user, snapshot)) {
            return blocked(false, runtimeConfigResolver.copyText(snapshot,
                    "error_age_not_allowed", "年龄不符合平台准入要求"));
        }
        boolean tripleApproved = auditService.certificationApprovedCount(user.getId()) == 3;
        AccessStatusVO vo = new AccessStatusVO();
        vo.setCanBrowseCards(true);
        vo.setCanCommunity(true);
        vo.setCanMatch(tripleApproved);
        vo.setCanMessage(tripleApproved);
        vo.setCanBeExposed(tripleApproved);
        vo.setCoreAccessStatus(tripleApproved ? "CORE_ALLOWED" : "NON_CORE_ONLY");
        vo.setBlockReasons(tripleApproved ? List.of() : List.of(runtimeConfigResolver.copyText(snapshot,
                "core_access_triple_not_passed", "请完成实名、头像、学历三重认证后继续使用")));
        return vo;
    }

    private boolean ageOutsidePolicy(AppUser user, Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot) {
        Integer age = null;
        if (user.getBirthday() != null) {
            age = scoreConfig.calculateAge(user.getBirthday());
        } else if (user.getAge() != null) {
            age = user.getAge();
        }
        if (age == null) {
            return false;
        }
        Map<String, Object> accessPolicy = runtimeConfigResolver.accessPolicy(snapshot);
        int minAge = number(accessPolicy.get("minAge"), 18);
        int maxAge = number(accessPolicy.get("maxAge"), 60);
        return age < minAge || age > maxAge;
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

    private AccessStatusVO blocked(boolean canBrowse, String reason) {
        AccessStatusVO vo = new AccessStatusVO();
        vo.setCanBrowseCards(canBrowse);
        vo.setCanCommunity(canBrowse);
        vo.setCanMatch(false);
        vo.setCanMessage(false);
        vo.setCanBeExposed(false);
        vo.setCoreAccessStatus("CORE_BLOCKED");
        vo.setBlockReasons(List.of(reason));
        return vo;
    }
}

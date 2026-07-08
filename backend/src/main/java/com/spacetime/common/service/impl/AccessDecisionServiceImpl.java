package com.spacetime.common.service.impl;

import com.spacetime.common.dto.AccessDecision;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.service.AccessDecisionService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 核心准入判定服务。
 *
 * 统一封装首登、账号状态、实名、头像、学历三重认证的判定口径，
 * 避免管理后台、移动端接口各自写一套准入规则导致断链。
 */
@Service
public class AccessDecisionServiceImpl implements AccessDecisionService {

    @Override
    public AccessDecision decide(AppUser user, AppUserVerification verification) {
        if (user == null) {
            return AccessDecision.blocked(false, "用户不存在");
        }
        if (!AccountStatusEnum.NORMAL.getCode().equals(user.getAccountStatus())) {
            return AccessDecision.blocked(false, "账号状态异常");
        }
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() != 1) {
            return AccessDecision.blocked(false, "请先完成资料初始化");
        }

        List<String> missing = new ArrayList<>();
        if (!isApproved(verification == null ? null : verification.getRealNameStatus())) {
            missing.add("实名认证");
        }
        if (!isApproved(verification == null ? null : verification.getAvatarVerifyStatus())) {
            missing.add("头像认证");
        }
        if (!isApproved(verification == null ? null : verification.getEducationStatus())) {
            missing.add("学历认证");
        }
        if (!missing.isEmpty()) {
            return AccessDecision.nonCoreOnly(String.join("、", missing) + "未通过");
        }
        return AccessDecision.allowed();
    }

    private boolean isApproved(String status) {
        return VerificationStatusEnum.APPROVED.getCode().equals(status);
    }
}

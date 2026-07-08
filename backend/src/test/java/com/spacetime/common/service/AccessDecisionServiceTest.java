package com.spacetime.common.service;

import com.spacetime.common.dto.AccessDecision;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.service.impl.AccessDecisionServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AccessDecisionService L3 测试")
class AccessDecisionServiceTest {

    private final AccessDecisionService service = new AccessDecisionServiceImpl();

    @Test
    @DisplayName("三重认证均通过且账号正常时开放核心准入")
    void shouldAllowCoreAccessWhenTripleVerificationApproved() {
        AppUser user = normalCompletedUser();
        AppUserVerification verification = verification(
                VerificationStatusEnum.APPROVED.getCode(),
                VerificationStatusEnum.APPROVED.getCode(),
                VerificationStatusEnum.APPROVED.getCode());

        AccessDecision decision = service.decide(user, verification);

        assertThat(decision.getCoreAccessStatus()).isEqualTo("CORE_ALLOWED");
        assertThat(decision.getCanBrowseCards()).isTrue();
        assertThat(decision.getCanMatch()).isTrue();
        assertThat(decision.getCanBeExposed()).isTrue();
        assertThat(decision.getBlockReason()).isNull();
    }

    @Test
    @DisplayName("缺少学历认证时仅开放非核心能力")
    void shouldBlockCoreAccessWhenEducationMissing() {
        AppUser user = normalCompletedUser();
        AppUserVerification verification = verification(
                VerificationStatusEnum.APPROVED.getCode(),
                VerificationStatusEnum.PENDING.getCode(),
                VerificationStatusEnum.APPROVED.getCode());

        AccessDecision decision = service.decide(user, verification);

        assertThat(decision.getCoreAccessStatus()).isEqualTo("NON_CORE_ONLY");
        assertThat(decision.getCanBrowseCards()).isTrue();
        assertThat(decision.getCanMatch()).isFalse();
        assertThat(decision.getCanBeExposed()).isFalse();
        assertThat(decision.getBlockReason()).contains("学历");
    }

    @Test
    @DisplayName("冻结账号优先阻断全部能力")
    void shouldBlockAllAccessWhenAccountFrozen() {
        AppUser user = normalCompletedUser();
        user.setAccountStatus(AccountStatusEnum.FROZEN.getCode());
        AppUserVerification verification = verification(
                VerificationStatusEnum.APPROVED.getCode(),
                VerificationStatusEnum.APPROVED.getCode(),
                VerificationStatusEnum.APPROVED.getCode());

        AccessDecision decision = service.decide(user, verification);

        assertThat(decision.getCoreAccessStatus()).isEqualTo("CORE_BLOCKED");
        assertThat(decision.getCanBrowseCards()).isFalse();
        assertThat(decision.getCanMatch()).isFalse();
        assertThat(decision.getCanBeExposed()).isFalse();
        assertThat(decision.getBlockReason()).contains("账号");
    }

    private AppUser normalCompletedUser() {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(1);
        return user;
    }

    private AppUserVerification verification(String realName, String education, String avatar) {
        AppUserVerification verification = new AppUserVerification();
        verification.setUserId(1L);
        verification.setRealNameStatus(realName);
        verification.setEducationStatus(education);
        verification.setAvatarVerifyStatus(avatar);
        return verification;
    }
}

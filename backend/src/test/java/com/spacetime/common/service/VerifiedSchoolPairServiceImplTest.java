package com.spacetime.common.service;

import com.spacetime.common.entity.AppUser;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.VerifiedSchoolPairService.VerifiedSchoolPairResult;
import com.spacetime.common.service.impl.VerifiedSchoolPairServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VerifiedSchoolPairServiceImplTest {
    @Mock private RelationAccessProjectionService accessProjectionService;

    private VerifiedSchoolPairServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VerifiedSchoolPairServiceImpl(accessProjectionService);
    }

    @Test
    void sameProfileSchoolCodeShouldBeEligible() {
        AppUser sender = user(7L, "BNU", "北京师范大学");
        AppUser receiver = user(8L, "bnu", "北京师范大学珠海校区");
        allow(sender, receiver);

        VerifiedSchoolPairResult result = service.resolve(sender, receiver);

        assertThat(result.sameSchool()).isTrue();
        assertThat(result.canonicalSchoolCode()).isEqualTo("BNU");
        assertThat(result.qualificationFingerprint()).isNotBlank();
    }

    @Test
    void codedSenderShouldMatchLegacyNameOnlyReceiver() {
        AppUser sender = user(7L, "BNU", "北京师范大学");
        AppUser receiver = user(8L, null, "北京师范大学");
        allow(sender, receiver);

        VerifiedSchoolPairResult result = service.resolve(sender, receiver);

        assertThat(result.sameSchool()).isTrue();
        assertThat(result.canonicalSchoolCode()).hasSize(64);
        assertThat(result.canonicalSchoolCode()).doesNotContain("北京师范大学");
    }

    @Test
    void legacySenderShouldMatchSameNameReceiverEvenWhenReceiverHasCode() {
        AppUser sender = user(7L, null, "北京师范大学");
        AppUser receiver = user(8L, "BNU", "北京师范大学");
        allow(sender, receiver);

        VerifiedSchoolPairResult result = service.resolve(sender, receiver);

        assertThat(result.sameSchool()).isTrue();
    }

    @Test
    void differentNonBlankCodesShouldNotMatchByName() {
        AppUser sender = user(7L, "BNU", "北京师范大学");
        AppUser receiver = user(8L, "OTHER", "北京师范大学");

        VerifiedSchoolPairResult result = service.resolve(sender, receiver);

        assertThat(result.sameSchool()).isFalse();
        assertThat(result.reasonCode()).isEqualTo("DIFFERENT_SCHOOL");
    }

    @Test
    void missingSenderSchoolProjectionShouldUseOriginalPaymentRules() {
        AppUser sender = user(7L, null, null);
        AppUser receiver = user(8L, "BNU", "北京师范大学");

        VerifiedSchoolPairResult result = service.resolve(sender, receiver);

        assertThat(result.sameSchool()).isFalse();
        assertThat(result.reasonCode()).isEqualTo("MISSING_SCHOOL_PROFILE");
    }

    @Test
    void sameSchoolShouldStillRequireBothUsersCoreAccess() {
        AppUser sender = user(7L, "BNU", "北京师范大学");
        AppUser receiver = user(8L, "BNU", "北京师范大学");
        when(accessProjectionService.project(sender)).thenReturn("OPEN");
        when(accessProjectionService.project(receiver)).thenReturn("CLOSED");

        assertThatThrownBy(() -> service.resolve(sender, receiver))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("同校免费资格");
    }

    private void allow(AppUser sender, AppUser receiver) {
        when(accessProjectionService.project(sender)).thenReturn("OPEN");
        when(accessProjectionService.project(receiver)).thenReturn("OPEN");
    }

    private AppUser user(Long id, String schoolCode, String schoolName) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setSchoolCode(schoolCode);
        user.setSchool(schoolName);
        return user;
    }
}

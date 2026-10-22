package com.spacetime.common.service;

import com.spacetime.common.dao.SchoolDictionaryDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.SchoolDictionary;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
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
    @Mock private AppUserAuditService appUserAuditService;
    @Mock private SchoolDictionaryDao schoolDictionaryDao;
    @Mock private RelationAccessProjectionService accessProjectionService;

    private VerifiedSchoolPairServiceImpl service;
    private AppUser sender;
    private AppUser receiver;

    @BeforeEach
    void setUp() {
        service = new VerifiedSchoolPairServiceImpl(
                appUserAuditService, schoolDictionaryDao, accessProjectionService);
        sender = user(7L);
        receiver = user(8L);
    }

    @Test
    void differentCampusCodesWithSameCanonicalSchoolShouldBeEligible() {
        when(appUserAuditService.latestEffectiveRecord(7L, AppUserAuditTypeEnum.EDUCATION))
                .thenReturn(education(101L, "CCNU_MAIN"));
        when(appUserAuditService.latestEffectiveRecord(8L, AppUserAuditTypeEnum.EDUCATION))
                .thenReturn(education(202L, "CCNU_NANHU"));
        when(schoolDictionaryDao.selectByCode("CCNU_MAIN"))
                .thenReturn(school("CCNU_MAIN", "CCNU"));
        when(schoolDictionaryDao.selectByCode("CCNU_NANHU"))
                .thenReturn(school("CCNU_NANHU", "CCNU"));
        when(accessProjectionService.project(sender)).thenReturn("OPEN");
        when(accessProjectionService.project(receiver)).thenReturn("OPEN");

        VerifiedSchoolPairResult result = service.resolve(sender, receiver);

        assertThat(result.sameSchool()).isTrue();
        assertThat(result.canonicalSchoolCode()).isEqualTo("CCNU");
        assertThat(result.qualificationFingerprint()).isNotBlank();
    }

    @Test
    void missingEffectiveEducationShouldUseOriginalPaymentRules() {
        when(appUserAuditService.latestEffectiveRecord(7L, AppUserAuditTypeEnum.EDUCATION))
                .thenReturn(null);

        VerifiedSchoolPairResult result = service.resolve(sender, receiver);

        assertThat(result.sameSchool()).isFalse();
        assertThat(result.reasonCode()).isEqualTo("MISSING_EFFECTIVE_EDUCATION");
    }

    @Test
    void approvedSchoolWithoutDictionaryMappingShouldFailClosed() {
        when(appUserAuditService.latestEffectiveRecord(7L, AppUserAuditTypeEnum.EDUCATION))
                .thenReturn(education(101L, "UNKNOWN"));
        when(appUserAuditService.latestEffectiveRecord(8L, AppUserAuditTypeEnum.EDUCATION))
                .thenReturn(education(202L, "CCNU"));
        when(schoolDictionaryDao.selectByCode("UNKNOWN")).thenReturn(null);

        assertThatThrownBy(() -> service.resolve(sender, receiver))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("学校认证信息暂不可用");
    }

    @Test
    void sameSchoolShouldStillRequireBothUsersCoreAccess() {
        when(appUserAuditService.latestEffectiveRecord(7L, AppUserAuditTypeEnum.EDUCATION))
                .thenReturn(education(101L, "CCNU"));
        when(appUserAuditService.latestEffectiveRecord(8L, AppUserAuditTypeEnum.EDUCATION))
                .thenReturn(education(202L, "CCNU"));
        when(schoolDictionaryDao.selectByCode("CCNU"))
                .thenReturn(school("CCNU", "CCNU"));
        when(accessProjectionService.project(sender)).thenReturn("OPEN");
        when(accessProjectionService.project(receiver)).thenReturn("CLOSED");

        assertThatThrownBy(() -> service.resolve(sender, receiver))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("同校免费资格");
    }

    private AppUser user(Long id) {
        AppUser user = new AppUser();
        user.setId(id);
        return user;
    }

    private AppUserAuditRecord education(Long id, String schoolCode) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id);
        record.setUserId(id);
        record.setSchoolCode(schoolCode);
        return record;
    }

    private SchoolDictionary school(String schoolCode, String canonicalSchoolCode) {
        SchoolDictionary school = new SchoolDictionary();
        school.setSchoolCode(schoolCode);
        school.setCanonicalSchoolCode(canonicalSchoolCode);
        school.setStatus("ENABLED");
        return school;
    }
}

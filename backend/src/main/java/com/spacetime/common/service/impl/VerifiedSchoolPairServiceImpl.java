package com.spacetime.common.service.impl;

import cn.hutool.crypto.digest.DigestUtil;
import com.spacetime.common.dao.SchoolDictionaryDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.SchoolDictionary;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.VerifiedSchoolPairService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Objects;

/** 同校免费资格的唯一后端判定入口。 */
@Service
@RequiredArgsConstructor
public class VerifiedSchoolPairServiceImpl implements VerifiedSchoolPairService {
    private static final int ACCESS_RESTRICTED = 30001;
    private static final int INTERNAL_ERROR = 5001;

    private final AppUserAuditService appUserAuditService;
    private final SchoolDictionaryDao schoolDictionaryDao;
    private final RelationAccessProjectionService accessProjectionService;

    @Override
    public VerifiedSchoolPairResult resolve(AppUser sender, AppUser receiver) {
        if (sender == null || sender.getId() == null || receiver == null || receiver.getId() == null) {
            throw new BusinessException(INTERNAL_ERROR, "同校免费资格校验参数异常");
        }
        AppUserAuditRecord senderEducation = effectiveEducation(sender.getId());
        if (senderEducation == null) {
            return notSame("MISSING_EFFECTIVE_EDUCATION");
        }
        AppUserAuditRecord receiverEducation = effectiveEducation(receiver.getId());
        if (receiverEducation == null) {
            return notSame("MISSING_EFFECTIVE_EDUCATION");
        }
        SchoolDictionary senderSchool = requireSchool(senderEducation.getSchoolCode());
        SchoolDictionary receiverSchool = requireSchool(receiverEducation.getSchoolCode());
        String senderCanonical = normalizeCanonical(senderSchool);
        String receiverCanonical = normalizeCanonical(receiverSchool);
        if (!Objects.equals(senderCanonical, receiverCanonical)) {
            return notSame("DIFFERENT_SCHOOL");
        }
        if (!"OPEN".equals(accessProjectionService.project(sender))
                || !"OPEN".equals(accessProjectionService.project(receiver))) {
            throw new BusinessException(ACCESS_RESTRICTED, "同校免费资格暂不可用，请完成认证后重试");
        }
        String fingerprintSource = senderEducation.getId() + ":" + receiverEducation.getId()
                + ":" + senderCanonical;
        return new VerifiedSchoolPairResult(true, senderCanonical,
                DigestUtil.sha256Hex(fingerprintSource), null);
    }

    private AppUserAuditRecord effectiveEducation(Long userId) {
        AppUserAuditRecord record = appUserAuditService.latestEffectiveRecord(
                userId, AppUserAuditTypeEnum.EDUCATION);
        return record != null && StringUtils.hasText(record.getSchoolCode()) ? record : null;
    }

    private SchoolDictionary requireSchool(String schoolCode) {
        SchoolDictionary school = schoolDictionaryDao.selectByCode(schoolCode);
        if (school == null || !StringUtils.hasText(school.getCanonicalSchoolCode())) {
            throw new BusinessException(INTERNAL_ERROR, "学校认证信息暂不可用，请稍后重试");
        }
        return school;
    }

    private String normalizeCanonical(SchoolDictionary school) {
        return school.getCanonicalSchoolCode().trim().toUpperCase(java.util.Locale.ROOT);
    }

    private VerifiedSchoolPairResult notSame(String reasonCode) {
        return new VerifiedSchoolPairResult(false, null, null, reasonCode);
    }
}

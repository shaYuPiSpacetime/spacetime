package com.spacetime.common.service.impl;

import cn.hutool.crypto.digest.DigestUtil;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.VerifiedSchoolPairService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Locale;

/** 同校免费资格的唯一后端判定入口。 */
@Service
@RequiredArgsConstructor
public class VerifiedSchoolPairServiceImpl implements VerifiedSchoolPairService {
    private static final int ACCESS_RESTRICTED = 30001;
    private static final int INTERNAL_ERROR = 5001;

    private final RelationAccessProjectionService accessProjectionService;

    @Override
    public VerifiedSchoolPairResult resolve(AppUser sender, AppUser receiver) {
        if (sender == null || sender.getId() == null || receiver == null || receiver.getId() == null) {
            throw new BusinessException(INTERNAL_ERROR, "同校免费资格校验参数异常");
        }
        String senderSchoolCode = normalizeSchoolCode(sender.getSchoolCode());
        String receiverSchoolCode = normalizeSchoolCode(receiver.getSchoolCode());
        String senderSchoolName = normalizeSchoolName(sender.getSchool());
        String receiverSchoolName = normalizeSchoolName(receiver.getSchool());
        if (senderSchoolCode == null && senderSchoolName == null) {
            return notSame("MISSING_SCHOOL_PROFILE");
        }

        String schoolSnapshot = resolveSchoolSnapshot(senderSchoolCode, senderSchoolName,
                receiverSchoolCode, receiverSchoolName);
        if (schoolSnapshot == null) {
            return notSame("DIFFERENT_SCHOOL");
        }
        if (!"OPEN".equals(accessProjectionService.project(sender))
                || !"OPEN".equals(accessProjectionService.project(receiver))) {
            throw new BusinessException(ACCESS_RESTRICTED, "同校免费资格暂不可用，请完成认证后重试");
        }
        String fingerprintSource = sender.getId() + ":" + receiver.getId()
                + ":" + value(senderSchoolCode) + ":" + value(senderSchoolName)
                + ":" + value(receiverSchoolCode) + ":" + value(receiverSchoolName);
        return new VerifiedSchoolPairResult(true, schoolSnapshot,
                DigestUtil.sha256Hex(fingerprintSource), null);
    }

    private String resolveSchoolSnapshot(String senderSchoolCode, String senderSchoolName,
                                         String receiverSchoolCode, String receiverSchoolName) {
        if (senderSchoolCode == null) {
            return sameSchoolName(senderSchoolName, receiverSchoolName)
                    ? nameSnapshot(senderSchoolName) : null;
        }
        if (senderSchoolCode.equals(receiverSchoolCode)) {
            return senderSchoolCode;
        }
        return receiverSchoolCode == null && sameSchoolName(senderSchoolName, receiverSchoolName)
                ? nameSnapshot(senderSchoolName) : null;
    }

    private boolean sameSchoolName(String senderSchoolName, String receiverSchoolName) {
        return senderSchoolName != null && senderSchoolName.equals(receiverSchoolName);
    }

    private String nameSnapshot(String schoolName) {
        return DigestUtil.sha256Hex("school-name:" + schoolName);
    }

    private String normalizeSchoolCode(String schoolCode) {
        return StringUtils.hasText(schoolCode)
                ? schoolCode.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizeSchoolName(String schoolName) {
        return StringUtils.hasText(schoolName) ? schoolName.trim() : null;
    }

    private String value(String value) {
        return value == null ? "" : value;
    }

    private VerifiedSchoolPairResult notSame(String reasonCode) {
        return new VerifiedSchoolPairResult(false, null, null, reasonCode);
    }
}

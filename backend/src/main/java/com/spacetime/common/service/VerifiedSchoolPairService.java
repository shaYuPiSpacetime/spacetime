package com.spacetime.common.service;

import com.spacetime.common.entity.AppUser;

/** 基于已生效学历认证和学校字典判断双方是否属于同一学校主体。 */
public interface VerifiedSchoolPairService {

    VerifiedSchoolPairResult resolve(AppUser sender, AppUser receiver);

    record VerifiedSchoolPairResult(
            boolean sameSchool,
            String canonicalSchoolCode,
            String qualificationFingerprint,
            String reasonCode) {
    }
}

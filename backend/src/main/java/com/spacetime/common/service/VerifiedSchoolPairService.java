package com.spacetime.common.service;

import com.spacetime.common.entity.AppUser;

/** 基于用户资料学校投影，按同校信息流规则判断发送方是否视接收方为同校。 */
public interface VerifiedSchoolPairService {

    VerifiedSchoolPairResult resolve(AppUser sender, AppUser receiver);

    record VerifiedSchoolPairResult(
            boolean sameSchool,
            String canonicalSchoolCode,
            String qualificationFingerprint,
            String reasonCode) {
    }
}

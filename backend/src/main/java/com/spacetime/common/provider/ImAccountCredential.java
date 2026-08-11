package com.spacetime.common.provider;

import java.time.Instant;

/** 服务端签发给小程序的腾讯云 TIM 登录凭证，不包含 SecretKey。 */
public record ImAccountCredential(
        long sdkAppId,
        String imUserId,
        String userSig,
        Instant expireAt,
        int protocolVersion) {
}

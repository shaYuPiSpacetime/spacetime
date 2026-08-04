package com.spacetime.common.community;

/**
 * 内容安全服务返回的稳定领域结果。
 */
public record CommunitySecurityResult(
        CommunitySecurityConclusion conclusion,
        String providerCode,
        String detail
) {
    public static CommunitySecurityResult pass(String code) {
        return new CommunitySecurityResult(CommunitySecurityConclusion.PASS, code, null);
    }

    public static CommunitySecurityResult reject(String code, String detail) {
        return new CommunitySecurityResult(CommunitySecurityConclusion.REJECT, code, detail);
    }

    public static CommunitySecurityResult review(String detail) {
        return new CommunitySecurityResult(CommunitySecurityConclusion.REVIEW, null, detail);
    }

    public static CommunitySecurityResult asyncReview(String traceIds) {
        return new CommunitySecurityResult(CommunitySecurityConclusion.REVIEW, "media_async:" + traceIds,
                "wechat_media_async_pending");
    }

    public static CommunitySecurityResult unavailable(String detail) {
        return new CommunitySecurityResult(CommunitySecurityConclusion.UNAVAILABLE, null, detail);
    }
}

package com.spacetime.common.provider.impl;

import com.spacetime.common.community.CommunitySecurityResult;
import com.spacetime.common.provider.ProviderCheckResult;

/** 微信内容安全领域结果到认证审核 Provider 结果的统一映射。 */
final class WechatProviderResultMapper {
    private static final String PROVIDER_CODE = "wechat-content-security";
    private static final String ASYNC_PREFIX = "media_async:";

    private WechatProviderResultMapper() {
    }

    static ProviderCheckResult map(CommunitySecurityResult result) {
        if (result == null) {
            return ProviderCheckResult.pending(PROVIDER_CODE, raw(null), false, null,
                    "wechat_result_missing");
        }
        return switch (result.conclusion()) {
            case PASS -> ProviderCheckResult.safe(PROVIDER_CODE, raw(result), false);
            case REJECT -> ProviderCheckResult.unsafe(PROVIDER_CODE, raw(result), false, result.detail());
            case REVIEW -> ProviderCheckResult.pending(PROVIDER_CODE, raw(result), false,
                    traceId(result.providerCode()), result.detail());
            case UNAVAILABLE -> ProviderCheckResult.pending(PROVIDER_CODE, raw(result), false,
                    null, result.detail());
        };
    }

    private static String traceId(String providerCode) {
        if (providerCode == null || !providerCode.startsWith(ASYNC_PREFIX)) {
            return null;
        }
        String value = providerCode.substring(ASYNC_PREFIX.length());
        return value.isBlank() ? null : value;
    }

    private static String raw(CommunitySecurityResult result) {
        if (result == null) {
            return "{\"conclusion\":\"UNAVAILABLE\",\"detail\":\"wechat_result_missing\"}";
        }
        return "{\"conclusion\":\"" + result.conclusion().name()
                + "\",\"providerCode\":\"" + json(result.providerCode())
                + "\",\"detail\":\"" + json(result.detail()) + "\"}";
    }

    private static String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

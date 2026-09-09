package com.spacetime.common.provider.impl;

import com.spacetime.common.community.CommunitySecurityResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.provider.ProviderCheckResult;

/** 微信内容安全领域结果到认证审核 Provider 结果的统一映射。 */
final class WechatProviderResultMapper {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String PROVIDER_CODE = "wechat-content-security";
    private static final String ASYNC_PREFIX = "media_async:";

    private WechatProviderResultMapper() {
    }

    static ProviderCheckResult map(CommunitySecurityResult result) {
        if (result == null) {
            return ProviderCheckResult.pending(PROVIDER_CODE, raw(null), false, null,
                    "wechat_result_missing");
        }
        String provider = result.providerCode()!=null && result.providerCode().startsWith("local_sensitive_word:") ? "local-sensitive-word" : PROVIDER_CODE;
        return switch (result.conclusion()) {
            case PASS -> ProviderCheckResult.safe(provider, raw(result), false);
            case REJECT -> ProviderCheckResult.unsafe(provider, raw(result), false, result.detail());
            case REVIEW -> ProviderCheckResult.pending(provider, raw(result), false,
                    traceId(result.providerCode()), result.detail());
            case UNAVAILABLE -> ProviderCheckResult.pending(provider, raw(result), false,
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
        var raw=JSON.createObjectNode();
        if(result==null){raw.put("conclusion","UNAVAILABLE");raw.put("detail","wechat_result_missing");return raw.toString();}
        raw.put("conclusion",result.conclusion().name());
        raw.put("providerCode",result.providerCode()==null?"":result.providerCode());
        raw.put("detail",result.detail()==null?"":result.detail());
        if(result.evidenceJson()!=null){
            try {raw.set("evidence",JSON.readTree(result.evidenceJson()));}
            catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalArgumentException("invalid_machine_evidence",e);}
        }
        return raw.toString();
    }
}

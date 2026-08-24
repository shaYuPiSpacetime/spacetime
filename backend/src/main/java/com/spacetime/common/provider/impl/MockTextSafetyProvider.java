package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * mock 文本安全 Provider。
 *
 * 先用 mock 保证开放性文字审核链路闭环，真实机审接入时替换实现即可。
 */
@Component
@ConditionalOnProperty(prefix = "prd01.content-security", name = "provider",
        havingValue = "mock", matchIfMissing = true)
public class MockTextSafetyProvider implements TextSafetyProvider {
    @Override
    public ProviderCheckResult check(String openId, String fieldName, String contentText) {
        return ProviderCheckResult.safe("mock-text", "{\"mocked\":true,\"result\":\"safe\"}", true);
    }
}

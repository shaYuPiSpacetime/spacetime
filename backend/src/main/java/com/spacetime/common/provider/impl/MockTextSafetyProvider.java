package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * mock 文本安全 Provider。
 *
 * 先用 mock 保证开放性文字审核链路闭环，真实机审接入时替换实现即可。
 */
@Primary
@Component
public class MockTextSafetyProvider implements TextSafetyProvider {
    @Override
    public ProviderCheckResult check(String fieldName, String contentText) {
        return ProviderCheckResult.safe("mock-text", "{\"mocked\":true,\"result\":\"safe\"}", true);
    }
}

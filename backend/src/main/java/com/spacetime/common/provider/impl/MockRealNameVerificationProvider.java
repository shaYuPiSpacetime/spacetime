package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.RealNameVerificationProvider;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/**
 * 联调阶段身份证二要素 mock Provider，默认返回一致。
 */
@Component
@ConditionalOnProperty(prefix = "real-name", name = "provider", havingValue = "mock", matchIfMissing = true)
public class MockRealNameVerificationProvider implements RealNameVerificationProvider {

    @Override
    public ProviderCheckResult check(String realName, String idCardNo) {
        return ProviderCheckResult.safe(
                "mock-real-name",
                "{\"mocked\":true,\"result\":\"pass\"}",
                true);
    }
}

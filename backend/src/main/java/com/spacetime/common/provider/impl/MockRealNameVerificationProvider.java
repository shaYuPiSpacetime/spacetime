package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.RealNameVerificationProvider;
import org.springframework.stereotype.Component;

/**
 * 联调阶段实名认证 mock Provider，默认返回三要素一致。
 */
@Component
public class MockRealNameVerificationProvider implements RealNameVerificationProvider {

    @Override
    public ProviderCheckResult check(String realName, String idCardNo, String phone) {
        return ProviderCheckResult.safe(
                "mock-real-name",
                "{\"mocked\":true,\"result\":\"pass\"}",
                true);
    }
}

package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.EducationVerificationProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * 学历认证 Mock Provider。
 *
 * <p>当前固定返回通过，用于打通学历机审闭环。真实学信网或证书核验接入时替换该实现。</p>
 */
@Primary
@Component
public class MockEducationVerificationProvider implements EducationVerificationProvider {

    @Override
    public ProviderCheckResult check(String educationMethod, String schoolName, String materialJson) {
        return ProviderCheckResult.safe(
                "mock-education",
                "{\"mocked\":true,\"result\":\"pass\",\"method\":\"" + json(educationMethod) + "\"}",
                true);
    }

    private String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

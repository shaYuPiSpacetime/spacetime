package com.spacetime.common.provider;

import com.spacetime.common.provider.impl.MockEducationVerificationProvider;
import com.spacetime.common.provider.impl.MockImageSafetyProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 当前尚未接入真实三方的审核 Provider 测试。
 */
@DisplayName("待接三方审核 Mock Provider")
class MockPendingAuditProviderTest {

    @Test
    @DisplayName("头像、相册和背景图统一走图片安全 Mock")
    void shouldMockImageSafetyCheck() {
        ImageSafetyProvider provider = new MockImageSafetyProvider();

        ProviderCheckResult result = provider.check(
                "openid-1", "AVATAR", "https://static.example.com/avatar.jpg", null);

        assertThat(result.getSafe()).isTrue();
        assertThat(result.getMocked()).isTrue();
        assertThat(result.getProviderCode()).isEqualTo("mock-image-safety");
    }

    @Test
    @DisplayName("学历认证统一走学历核验 Mock")
    void shouldMockEducationVerification() {
        EducationVerificationProvider provider = new MockEducationVerificationProvider();

        ProviderCheckResult result = provider.check(
                "CHSI", "浙江工业大学", "{\"chsiCode\":\"123456789012\"}");

        assertThat(result.getSafe()).isTrue();
        assertThat(result.getMocked()).isTrue();
        assertThat(result.getProviderCode()).isEqualTo("mock-education");
    }
}

package com.spacetime.common.provider;

import com.spacetime.common.provider.impl.MockSmsCodeProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("手机号登录短信验证码位数")
class SmsCodeProviderTest {

    @Test
    @DisplayName("真实短信通道生成四位数字验证码")
    void realProviderGeneratesFourDigits() {
        SmsCodeProvider provider = new SmsCodeProvider() {
            @Override
            public String providerCode() {
                return "TEST";
            }

            @Override
            public void sendLoginCode(String phone, String code, int validMinutes) {
            }
        };

        for (int attempt = 0; attempt < 100; attempt++) {
            assertThat(provider.generateCode()).matches("\\d{4}");
        }
    }

    @Test
    @DisplayName("Mock 短信通道返回四位验证码")
    void mockProviderGeneratesFourDigits() {
        assertThat(new MockSmsCodeProvider().generateCode()).isEqualTo("0000");
    }
}

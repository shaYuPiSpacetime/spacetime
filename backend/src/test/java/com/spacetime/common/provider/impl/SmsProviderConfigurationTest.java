package com.spacetime.common.provider.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.provider.SmsCodeProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("短信 Provider 环境选择")
class SmsProviderConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(ObjectMapper.class, ObjectMapper::new)
            .withUserConfiguration(MockSmsCodeProvider.class, AliyunSmsConfiguration.class);

    @Test
    @DisplayName("未配置通道时只启用 mock")
    void shouldUseMockByDefault() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(SmsCodeProvider.class);
            assertThat(context.getBean(SmsCodeProvider.class).providerCode()).isEqualTo("MOCK");
        });
    }

    @Test
    @DisplayName("aliyun 通道使用短信专用凭证并启用真实 Provider")
    void shouldUseAliyunWhenConfigured() {
        contextRunner
                .withPropertyValues(
                        "sms.provider=aliyun",
                        "sms.aliyun.access-key-id=test-sms-id",
                        "sms.aliyun.access-key-secret=test-sms-secret")
                .run(context -> {
                    assertThat(context).hasSingleBean(SmsCodeProvider.class);
                    assertThat(context.getBean(SmsCodeProvider.class).providerCode()).isEqualTo("ALIYUN_SMS");
                    AliyunSmsProperties properties = context.getBean(AliyunSmsProperties.class);
                    assertThat(properties.getSignName()).isEqualTo("上海兴家立业网络科技");
                    assertThat(properties.getTemplateCode()).isEqualTo("SMS_336060313");
                });
    }

    @Test
    @DisplayName("aliyun 通道缺少短信凭证时拒绝启动")
    void shouldRejectMissingAliyunCredentials() {
        contextRunner
                .withPropertyValues("sms.provider=aliyun")
                .run(context -> assertThat(context).hasFailed());
    }
}

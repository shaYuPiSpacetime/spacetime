package com.spacetime.common.provider.impl;

import com.aliyun.dysmsapi20170525.Client;
import com.aliyun.teaopenapi.models.Config;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.provider.SmsCodeProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 仅在启用真实阿里云通道时创建短信客户端和 Provider。 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "sms", name = "provider", havingValue = "aliyun")
@EnableConfigurationProperties(AliyunSmsProperties.class)
public class AliyunSmsConfiguration {

    @Bean
    public Client aliyunSmsClient(AliyunSmsProperties properties) throws Exception {
        Config config = new Config()
                .setAccessKeyId(properties.getAccessKeyId())
                .setAccessKeySecret(properties.getAccessKeySecret());
        config.endpoint = properties.getEndpoint();
        return new Client(config);
    }

    @Bean
    public SmsCodeProvider aliyunSmsCodeProvider(Client client,
                                                 ObjectMapper objectMapper,
                                                 AliyunSmsProperties properties) {
        return new AliyunSmsCodeProvider(client, objectMapper, properties);
    }
}

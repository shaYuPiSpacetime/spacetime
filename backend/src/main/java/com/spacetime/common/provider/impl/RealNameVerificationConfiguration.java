package com.spacetime.common.provider.impl;

import com.aliyun.dytnsapi20200217.Client;
import com.aliyun.teaopenapi.models.Config;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.provider.RealNameVerificationProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "real-name", name = "provider", havingValue = "aliyun")
@EnableConfigurationProperties(RealNameVerificationProperties.class)
public class RealNameVerificationConfiguration {
    @Bean
    public Client aliyunRealNameClient(RealNameVerificationProperties properties) throws Exception {
        Config config = new Config()
                .setAccessKeyId(properties.getAccessKeyId())
                .setAccessKeySecret(properties.getAccessKeySecret())
                .setEndpoint(properties.getEndpoint());
        return new Client(config);
    }

    @Bean
    public RealNameVerificationProvider aliyunRealNameVerificationProvider(
            Client client, ObjectMapper objectMapper, RealNameVerificationProperties properties) {
        return new AliyunRealNameVerificationProvider(client, objectMapper, properties);
    }
}

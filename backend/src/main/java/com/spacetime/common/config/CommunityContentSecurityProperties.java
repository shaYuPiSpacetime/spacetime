package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** 社区内容安全配置。 */
@Data
@Component
@ConfigurationProperties(prefix = "community.content-security")
public class CommunityContentSecurityProperties {
    private String provider;
    private String callbackToken;
}

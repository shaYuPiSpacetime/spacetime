package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** 腾讯云即时通信 IM 服务端配置，SecretKey 只能由运行环境注入。 */
@Data
@Component
@ConfigurationProperties(prefix = "message.tencent-im")
public class TencentImProperties {
    private boolean enabled;
    private long sdkAppId;
    private String secretKey;
    private String administrator = "administrator";
    private String restBaseUrl = "https://console.tim.qq.com";
    private String callbackPathToken;
    private String callbackAuthToken;
    private long userSigExpireSeconds = 86400L;
    private int protocolVersion = 1;
    private int connectTimeoutMillis = 3000;
    private int requestTimeoutMillis = 5000;

    public boolean isServerConfigured() {
        return enabled && sdkAppId > 0 && notBlank(secretKey) && notBlank(administrator)
                && notBlank(restBaseUrl);
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}

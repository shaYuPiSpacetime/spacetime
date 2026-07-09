package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 微信小程序开放接口配置。
 */
@Data
@Component
@ConfigurationProperties(prefix = "wechat-miniapp")
public class WechatMiniappProperties {
    /** 小程序 AppID */
    private String appId;
    /** 小程序 AppSecret，仅从环境变量注入 */
    private String appSecret;
}

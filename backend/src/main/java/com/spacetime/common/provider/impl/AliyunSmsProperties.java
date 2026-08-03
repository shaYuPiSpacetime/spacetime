package com.spacetime.common.provider.impl;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * 阿里云短信配置。
 *
 * <p>仅在 {@code sms.provider=aliyun} 时注册并校验，凭证必须由运行环境注入。</p>
 */
@Validated
@ConfigurationProperties(prefix = "sms.aliyun")
public class AliyunSmsProperties {

    @NotBlank
    private String endpoint = "dysmsapi.aliyuncs.com";

    @NotBlank
    private String accessKeyId;

    @NotBlank
    private String accessKeySecret;

    @NotBlank
    private String signName = "上海兴家立业网络科技";

    @NotBlank
    private String templateCode = "SMS_336060313";

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getAccessKeyId() {
        return accessKeyId;
    }

    public void setAccessKeyId(String accessKeyId) {
        this.accessKeyId = accessKeyId;
    }

    public String getAccessKeySecret() {
        return accessKeySecret;
    }

    public void setAccessKeySecret(String accessKeySecret) {
        this.accessKeySecret = accessKeySecret;
    }

    public String getSignName() {
        return signName;
    }

    public void setSignName(String signName) {
        this.signName = signName;
    }

    public String getTemplateCode() {
        return templateCode;
    }

    public void setTemplateCode(String templateCode) {
        this.templateCode = templateCode;
    }
}

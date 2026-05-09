package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 阿里云 OSS 配置属性
 * 由 application-{profile}.yml 中的 oss.* 配置自动注入
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "oss")
public class OssConfig {
    /** OSS endpoint，如 oss-cn-hangzhou.aliyuncs.com */
    private String endpoint;
    /** AccessKey ID */
    private String accessKeyId;
    /** AccessKey Secret */
    private String accessKeySecret;
    /** Bucket 名称 */
    private String bucketName;
}

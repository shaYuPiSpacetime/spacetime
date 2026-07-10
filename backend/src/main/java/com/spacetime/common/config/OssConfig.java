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
    /** OSS endpoint，华东 2（上海）为 oss-cn-shanghai.aliyuncs.com */
    private String endpoint;
    /** AccessKey ID */
    private String accessKeyId;
    /** AccessKey Secret */
    private String accessKeySecret;
    /** Bucket 名称 */
    private String bucketName;
    /** CDN 加速域名（人像照片等公开资源），如 https://static.shikongxiehou.com。留空则退回 bucket 域名 */
    private String cdnDomain;
    /** 签名 URL 默认有效期（秒），默认 300（5分钟），用于身份照等敏感文件 */
    private int urlExpireSeconds = 300;
}

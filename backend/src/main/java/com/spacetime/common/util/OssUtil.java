package com.spacetime.common.util;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.GeneratePresignedUrlRequest;
import com.spacetime.common.config.OssConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.net.URL;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Date;

/**
 * 阿里云 OSS 文件上传工具
 *
 * <h3>文件分类策略</h3>
 * <ul>
 *   <li><b>人像照片（头像、相册等）</b>：使用 {@link #uploadWithCdnUrl}，返回 CDN 永久短链，无鉴权</li>
 *   <li><b>身份/学历照（身份证、学位证等敏感文件）</b>：使用 {@link #uploadWithSignedUrl}，返回签名临时 URL，默认 5 分钟有效</li>
 * </ul>
 *
 * <p>上传时按日期分目录存储（yyyy/MM/dd/），文件名使用 UUID 保证唯一。</p>
 */
@Component
@RequiredArgsConstructor
public class OssUtil {

    private final OssConfig ossConfig;

    // ==================== 人像照片：CDN 永久短链 ====================

    /**
     * 上传文件到 OSS，返回 CDN 永久短链。
     * 适用于人像照片、头像、相册等非敏感文件。
     *
     * @param inputStream      文件输入流
     * @param originalFilename 原始文件名（用于提取扩展名）
     * @return CDN 短链 URL，如 https://static.shikongxiehou.com/2025/07/08/uuid.jpg
     */
    public String uploadWithCdnUrl(InputStream inputStream, String originalFilename) {
        String key = doUpload(inputStream, originalFilename);
        return toCdnUrl(key);
    }

    /**
     * 根据 OSS Key 拼接 CDN 永久短链。
     * 若有配置 CDN 域名则使用 CDN，否则退回 bucket 公网域名。
     *
     * @param key OSS 对象 Key
     * @return CDN 短链 URL
     */
    public String toCdnUrl(String key) {
        if (StrUtil.isNotBlank(ossConfig.getCdnDomain())) {
            // 去掉可能带的多余前缀，保证 https:// 开头、结尾无 /
            String cdn = ossConfig.getCdnDomain().replaceFirst("^https?://", "");
            String domain = cdn.endsWith("/") ? cdn.substring(0, cdn.length() - 1) : cdn;
            return "https://" + domain + "/" + key;
        }
        // 未配置 CDN 时退回 bucket 公网域名
        String publicEndpoint = ossConfig.getEndpoint().replaceFirst("^https?://", "");
        return "https://" + ossConfig.getBucketName() + "." + publicEndpoint + "/" + key;
    }

    // ==================== 身份/学历照：签名临时 URL ====================

    /**
     * 上传文件到 OSS，返回带签名的临时访问 URL。
     * 适用于身份照、学历证等敏感文件，默认 {@link OssConfig#getUrlExpireSeconds()} 有效。
     *
     * @param inputStream      文件输入流
     * @param originalFilename 原始文件名（用于提取扩展名）
     * @return 签名临时 URL，如 https://bucket.oss-cn-shanghai.aliyuncs.com/uuid.jpg?Expires=...&Signature=...
     */
    public String uploadWithSignedUrl(InputStream inputStream, String originalFilename) {
        String key = doUpload(inputStream, originalFilename);
        return toSignedUrl(key);
    }

    /**
     * 获取指定 Key 的签名临时 URL。
     *
     * @param key OSS 对象 Key
     * @return 签名临时 URL
     */
    public String toSignedUrl(String key) {
        return toSignedUrl(key, ossConfig.getUrlExpireSeconds());
    }

    /**
     * 获取指定 Key 的签名临时 URL，自定义有效期。
     *
     * @param key            OSS 对象 Key
     * @param expireSeconds  有效期（秒）
     * @return 签名临时 URL
     */
    public String toSignedUrl(String key, int expireSeconds) {
        OSS oss = new OSSClientBuilder().build(
                ossConfig.getEndpoint(), ossConfig.getAccessKeyId(), ossConfig.getAccessKeySecret());
        try {
            Date expiration = new Date(System.currentTimeMillis() + expireSeconds * 1000L);
            GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(
                    ossConfig.getBucketName(), key);
            request.setExpiration(expiration);
            URL url = oss.generatePresignedUrl(request);
            // OSS SDK 返回的 URL 默认是 http，强制 https
            return url.toString().replaceFirst("^http://", "https://");
        } finally {
            oss.shutdown();
        }
    }

    // ==================== 内部方法 ====================

    /**
     * 执行文件上传，返回 OSS Key。
     */
    private String doUpload(InputStream inputStream, String originalFilename) {
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String ext = StrUtil.blankToDefault(
                originalFilename.substring(originalFilename.lastIndexOf(".")), ".jpg");
        String key = datePath + "/" + IdUtil.simpleUUID() + ext;
        OSS oss = new OSSClientBuilder().build(
                ossConfig.getEndpoint(), ossConfig.getAccessKeyId(), ossConfig.getAccessKeySecret());
        try {
            oss.putObject(ossConfig.getBucketName(), key, inputStream);
        } finally {
            oss.shutdown();
        }
        return key;
    }
}

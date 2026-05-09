package com.spacetime.common.util;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.spacetime.common.config.OssConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * 阿里云 OSS 文件上传工具
 * 文件按日期分目录存储，文件名使用 UUID 保证唯一
 */
@Component
@RequiredArgsConstructor
public class OssUtil {

    private final OssConfig ossConfig;

    /**
     * 上传文件到 OSS
     * @param inputStream 文件输入流
     * @param originalFilename 原始文件名（用于提取扩展名）
     * @return 文件访问 URL
     */
    public String upload(InputStream inputStream, String originalFilename) {
        // 按日期分目录：yyyy/MM/dd/
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        // 提取扩展名，默认 .jpg
        String ext = StrUtil.blankToDefault(
                originalFilename.substring(originalFilename.lastIndexOf(".")), ".jpg");
        // UUID 作为文件名，避免冲突
        String key = datePath + "/" + IdUtil.simpleUUID() + ext;
        OSS oss = new OSSClientBuilder().build(
                ossConfig.getEndpoint(), ossConfig.getAccessKeyId(), ossConfig.getAccessKeySecret());
        try {
            oss.putObject(ossConfig.getBucketName(), key, inputStream);
        } finally {
            oss.shutdown();
        }
        // 拼接完整访问 URL
        return "https://" + ossConfig.getBucketName() + "." + ossConfig.getEndpoint() + "/" + key;
    }
}

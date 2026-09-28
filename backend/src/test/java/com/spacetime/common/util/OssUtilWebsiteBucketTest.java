package com.spacetime.common.util;

import com.spacetime.common.config.OssConfig;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OssUtilWebsiteBucketTest {

    @Test
    void websiteSignedUrlMustUseSeparatePrivateBucket() {
        OssConfig config = config();
        config.setWebsiteBucketName("private-website-bucket");
        OssUtil oss = new OssUtil(config);

        assertThat(oss.toWebsiteSignedUrl("website/1/photo.png"))
                .startsWith("https://private-website-bucket.oss-cn-shanghai.aliyuncs.com/");
        assertThat(oss.toSignedUrl("miniapp/photo.png"))
                .startsWith("https://public-miniapp-bucket.oss-cn-shanghai.aliyuncs.com/");
    }

    @Test
    void websiteMediaMustFailClosedWhenPrivateBucketIsMissingOrShared() {
        OssConfig config = config();
        OssUtil oss = new OssUtil(config);

        assertThatThrownBy(() -> oss.toWebsiteSignedUrl("website/1/photo.png"))
                .isInstanceOf(IllegalStateException.class);

        config.setWebsiteBucketName("public-miniapp-bucket");
        assertThatThrownBy(() -> oss.toWebsiteSignedUrl("website/1/photo.png"))
                .isInstanceOf(IllegalStateException.class);
    }

    private static OssConfig config() {
        OssConfig config = new OssConfig();
        config.setEndpoint("https://oss-cn-shanghai.aliyuncs.com");
        config.setAccessKeyId("test-id");
        config.setAccessKeySecret("test-secret");
        config.setBucketName("public-miniapp-bucket");
        config.setUrlExpireSeconds(60);
        return config;
    }
}

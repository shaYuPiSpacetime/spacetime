package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.ImageSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 图片内容安全 Mock Provider。
 *
 * <p>当前固定返回通过，用于打通头像、相册和背景图机审闭环。接真实三方时替换该实现。</p>
 */
@Component
@ConditionalOnProperty(prefix = "prd01.content-security", name = "provider",
        havingValue = "mock", matchIfMissing = true)
public class MockImageSafetyProvider implements ImageSafetyProvider {

    @Override
    public ProviderCheckResult check(String openId, String auditType, String mediaUrl, String thumbUrl) {
        return ProviderCheckResult.safe(
                "mock-image-safety",
                "{\"mocked\":true,\"result\":\"safe\",\"auditType\":\"" + json(auditType) + "\"}",
                true);
    }

    private String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

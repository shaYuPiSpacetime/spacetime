package com.spacetime.common.provider.impl;

import com.spacetime.common.community.CommunityContentSecurityPort;
import com.spacetime.common.provider.ImageSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

/** 头像、相册和资料背景图微信异步内容安全实现。 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "prd01.content-security", name = "provider", havingValue = "wechat")
public class WechatImageSafetyProvider implements ImageSafetyProvider {
    private final CommunityContentSecurityPort contentSecurityPort;

    @Override
    public ProviderCheckResult check(String openId, String auditType, String mediaUrl, String thumbUrl) {
        return WechatProviderResultMapper.map(
                contentSecurityPort.checkImages(openId, List.of(mediaUrl), "profile"));
    }
}

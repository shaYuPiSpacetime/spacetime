package com.spacetime.common.provider.impl;

import com.spacetime.common.community.CommunityContentSecurityPort;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** 认证资料开放文本微信内容安全实现。 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "prd01.content-security", name = "provider", havingValue = "wechat")
public class WechatTextSafetyProvider implements TextSafetyProvider {
    private final CommunityContentSecurityPort contentSecurityPort;

    @Override
    public ProviderCheckResult check(String openId, String fieldName, String contentText) {
        return WechatProviderResultMapper.map(contentSecurityPort.checkText(openId, contentText, "profile"));
    }
}

package com.spacetime.common.provider.impl;

import com.spacetime.common.community.CommunityContentSecurityPort;
import com.spacetime.common.provider.AudioSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** 语音介绍微信异步内容安全实现。 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "prd01.content-security", name = "provider", havingValue = "wechat")
public class WechatAudioSafetyProvider implements AudioSafetyProvider {
    private final CommunityContentSecurityPort contentSecurityPort;

    @Override
    public ProviderCheckResult check(String openId, String voiceUrl, Integer duration) {
        return WechatProviderResultMapper.map(contentSecurityPort.checkAudio(openId, voiceUrl, "profile"));
    }
}

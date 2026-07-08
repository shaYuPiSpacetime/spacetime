package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.AudioSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * mock 语音安全 Provider。
 *
 * 当前阶段先固定返回通过，保证语音介绍链路可联调；后续接入真实三方时，
 * 只需要替换该 Provider 实现，不改变语音介绍接口和入库结构。
 */
@Primary
@Component
public class MockAudioSafetyProvider implements AudioSafetyProvider {
    @Override
    public ProviderCheckResult check(String voiceUrl, Integer duration) {
        return ProviderCheckResult.safe("mock-audio", "{\"mocked\":true,\"result\":\"safe\"}", true);
    }
}

package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.ImAccountCredential;
import com.spacetime.common.provider.InstantMessageAccountProvider;
import com.spacetime.common.provider.InstantMessageCommand;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.common.provider.InstantMessageProvider;
import com.spacetime.common.provider.InstantMessageSendResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** 未启用 TIM 时保留应用启动能力，任何真实凭证或投递请求均明确失败。 */
@Component
@ConditionalOnProperty(prefix = "message.tencent-im", name = "enabled",
        havingValue = "false", matchIfMissing = true)
public class UnavailableInstantMessageProvider
        implements InstantMessageProvider, InstantMessageAccountProvider {

    @Override
    public InstantMessageSendResult send(InstantMessageCommand command) {
        throw unavailable();
    }

    @Override
    public void syncAccount(Long userId, String nickname, String avatarUrl) {
        throw unavailable();
    }

    @Override
    public ImAccountCredential issueCredential(Long userId, String nickname, String avatarUrl) {
        throw unavailable();
    }

    private InstantMessageException unavailable() {
        return new InstantMessageException("TIM_NOT_CONFIGURED", "腾讯云TIM服务未配置", false);
    }
}

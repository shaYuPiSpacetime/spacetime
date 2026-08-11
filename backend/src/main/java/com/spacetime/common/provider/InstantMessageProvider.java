package com.spacetime.common.provider;

/** 腾讯云 TIM 等即时通信渠道抽象。 */
public interface InstantMessageProvider {
    InstantMessageSendResult send(InstantMessageCommand command);
}

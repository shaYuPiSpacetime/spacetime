package com.spacetime.miniapp.service;

import java.time.LocalDateTime;

/** 悄悄话短期可信报价存储，令牌内容只在服务端保存。 */
public interface WhisperQuoteStore {
    String issue(WhisperQuoteSnapshot snapshot);

    WhisperQuoteSnapshot read(String quoteToken);

    record WhisperQuoteSnapshot(
            Long senderUserId,
            Long receiverUserId,
            String targetUserNo,
            String sourceScene,
            String sourceBizNo,
            String payType,
            Integer coinAmount,
            Integer freeRemain,
            String configVersion,
            Integer expireDays,
            Integer cooldownDays,
            LocalDateTime expireAt) {
    }
}

package com.spacetime.common.service;

import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.TradeOrder;

import java.time.LocalDateTime;

/** 将 PRD-04 已提交的资产事实转换为系统消息。 */
public interface AssetResultMessageNotificationService {
    void publishOrderAfterCommit(TradeOrder order, LocalDateTime occurredAt);

    boolean publishOrderNow(TradeOrder order, LocalDateTime occurredAt);

    void publishWhisperCompensationAfterCommit(
            AppMessageWhisper whisper, LocalDateTime occurredAt);

    boolean publishWhisperCompensationNow(
            AppMessageWhisper whisper, LocalDateTime occurredAt);
}

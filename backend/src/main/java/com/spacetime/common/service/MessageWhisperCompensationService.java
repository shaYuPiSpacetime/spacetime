package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 悄悄话永久投递失败后的资产补偿。 */
public interface MessageWhisperCompensationService {
    int compensateBatch(LocalDateTime now, int limit);
}

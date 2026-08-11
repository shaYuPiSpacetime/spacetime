package com.spacetime.common.task;

import com.spacetime.common.service.MessageWhisperCompensationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 周期处理 TIM 永久投递失败后的悄悄话资产补偿。 */
@Component
@RequiredArgsConstructor
public class MessageWhisperCompensationTask {
    private final MessageWhisperCompensationService compensationService;

    @Scheduled(initialDelayString = "${message.whisper-compensation.initial-delay-ms:10000}",
            fixedDelayString = "${message.whisper-compensation.fixed-delay-ms:5000}")
    public void compensate() {
        compensationService.compensateBatch(LocalDateTime.now(), 100);
    }
}

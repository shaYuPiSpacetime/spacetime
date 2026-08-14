package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 创建悄悄话结果。 */
@Data
public class WhisperCreateVO {
    private String whisperNo;
    private String sendStatus;
    private String whisperStatus;
    private String paymentStatus;
    private String targetUserNo;
    private String payType;
    private Integer coinAmount;
    private Integer coinBalance;
    /** 当前调用是否真实扣除了成家币。 */
    private Boolean charged;
    private LocalDateTime createdTime;
    private LocalDateTime expireTime;
}

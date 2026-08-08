package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 创建悄悄话结果。 */
@Data
public class WhisperCreateVO {
    private String whisperNo;
    private String status;
    private String targetUserNo;
    private String content;
    private Integer coinCost;
    private Integer coinBalance;
    /** 当前调用是否真实扣除了成家币。 */
    private Boolean charged;
    private String paymentMethod;
    private LocalDateTime createTime;
    private LocalDateTime expireTime;
}

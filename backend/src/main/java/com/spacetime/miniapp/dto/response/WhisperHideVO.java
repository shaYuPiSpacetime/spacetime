package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 接收方逻辑隐藏悄悄话结果。 */
@Data
public class WhisperHideVO {
    private String whisperNo;
    private String bucket;
    private Integer hiddenCount;
    private LocalDateTime hiddenTime;
}

package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 悄悄话发送预检查结果。 */
@Data
public class WhisperPrecheckVO {
    private Boolean allowed;
    private String reasonCode;
    private String reasonText;
    private Integer contentMaxLength;
    private Integer coinAmount;
    private Boolean free;
    private Integer coinBalance;
    private Integer freeWhisperRemain;
    private String targetUserNo;
    private String targetNickname;
    private String targetAvatarUrl;
}

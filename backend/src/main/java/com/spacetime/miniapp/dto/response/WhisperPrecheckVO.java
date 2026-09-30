package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 悄悄话发送预检查结果。 */
@Data
public class WhisperPrecheckVO {
    private Boolean canSend;
    private String reasonCode;
    private String reasonText;
    private Integer contentMaxLength;
    private String payType;
    private Integer coinAmount;
    private Boolean free;
    private Integer coinBalance;
    private Integer freeWhisperRemain;
    /** 后台配置的会员每日免费悄悄话总次数，未开通会员时也返回，供页面正确展示权益。 */
    private Integer freeWhisperDailyQuota;
    private String quoteToken;
    private java.time.LocalDateTime quoteExpireTime;
    private Integer whisperExpireDays;
    private Integer cooldownDays;
    private String confirmText;
    private String targetUserNo;
    private String targetNickname;
}

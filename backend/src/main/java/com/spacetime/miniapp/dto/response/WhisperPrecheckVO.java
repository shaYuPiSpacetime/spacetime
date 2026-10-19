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
    /** 仅当前有效会员当天免费额度已用尽时为 true，已回复的成功发送也计入额度。 */
    private Boolean freeWhisperExhausted;
    private String quoteToken;
    private java.time.LocalDateTime quoteExpireTime;
    private Integer whisperExpireDays;
    private Integer cooldownDays;
    private String confirmText;
    private String targetUserNo;
    private String targetNickname;
    /** 已有待处理悄悄话编号；存在时前端应进入详情而不是重复新建。 */
    private String existingWhisperNo;
    /** 已有私信会话编号；匹配完成时前端应进入私信。 */
    private String existingConversationNo;
}

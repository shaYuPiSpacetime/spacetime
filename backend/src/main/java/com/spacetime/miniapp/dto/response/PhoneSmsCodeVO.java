package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 手机号登录验证码发送响应。
 */
@Data
public class PhoneSmsCodeVO {
    /** 获取验证码按钮倒计时秒数。 */
    private Integer countdownSeconds;
    /** 验证码有效期分钟数。 */
    private Integer validMinutes;
    /** 每日发送上限。 */
    private Integer dailyLimit;
    /** 当日剩余可发送次数。 */
    private Integer dailyRemaining;
    /** 当前短信 Provider 编码。 */
    private String providerCode;
}

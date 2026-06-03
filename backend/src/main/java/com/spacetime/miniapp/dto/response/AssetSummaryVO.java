package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 用户资产汇总响应
 */
@Data
public class AssetSummaryVO {
    /** VIP 状态 */
    private String vipStatus;
    /** VIP 到期时间 */
    private LocalDateTime vipExpireTime;
    /** 成家币余额 */
    private Integer coinBalance;
    /** 今日免费私语剩余次数 */
    private Integer todayFreeWhisperRemain;
    /** 累计充值金额 */
    private BigDecimal totalRecharge;
}

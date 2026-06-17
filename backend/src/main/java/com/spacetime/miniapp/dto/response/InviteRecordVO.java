package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 邀请记录响应。
 */
@Data
public class InviteRecordVO {
    private String relationNo;
    private String inviteeDisplay;
    private String relationStatus;
    private String relationStatusName;
    private BigDecimal rewardCoin;
    private LocalDateTime bindTime;
    private String invalidReasonText;
}

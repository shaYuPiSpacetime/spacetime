package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 校园推广员详情中的奖金记录。
 */
@Data
public class PromotionAgentBonusRecordVO {
    private String bonusNo;
    private String eventLabel;
    private String inviteeDisplayName;
    private BigDecimal bonusAmount;
    private LocalDateTime occurredAt;
    private String settlementNo;
}

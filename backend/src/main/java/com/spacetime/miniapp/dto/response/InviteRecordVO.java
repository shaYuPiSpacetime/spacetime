package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 邀请记录聚合响应。
 */
@Data
public class InviteRecordVO {
    private String relationNo;
    private InviteHomeVO.Invitee invitee;
    private LocalDateTime registeredAt;
    private BigDecimal paidTotal;
    private String rewardStatus;
    private List<RewardItem> rewardItems;

    @Data
    public static class RewardItem {
        private String rewardNo;
        private String eventType;
        private String eventLabel;
        private Integer ladderThreshold;
        private BigDecimal amount;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime paidAt;
        private String failureReason;
    }
}

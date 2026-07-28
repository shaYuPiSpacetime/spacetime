package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 邀请首页聚合响应。
 */
@Data
public class InviteHomeVO {
    private BigDecimal registerReward;
    private Integer successCount;
    private BigDecimal paidRewardTotal;
    private Integer progressCurrent;
    private Integer progressMax;
    private List<LadderItem> ladders;
    private List<RecentRecord> recentRecords;
    private ShareContext shareContext;

    @Data
    public static class LadderItem {
        private Integer threshold;
        private BigDecimal rewardAmount;
        private Boolean achieved;
    }

    @Data
    public static class RecentRecord {
        private String relationNo;
        private Invitee invitee;
        private java.time.LocalDateTime registeredAt;
        private BigDecimal rewardAmount;
        private String rewardStatus;
    }

    @Data
    public static class Invitee {
        private String userNo;
        private String nickname;
        private String avatarUrl;
        private String mobileMasked;
    }

    @Data
    public static class ShareContext {
        private String title;
        private String path;
        private String link;
        private java.util.Map<String, String> query;
        private String sourceType;
        private String sourceToken;
    }
}

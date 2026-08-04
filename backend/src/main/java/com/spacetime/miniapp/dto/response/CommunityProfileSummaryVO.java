package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 社区个人区服务端统计汇总。 */
@Data
public class CommunityProfileSummaryVO {
    private String nickname;
    private String avatar;
    private String description;
    private Stats stats;

    @Data
    public static class Stats {
        private Long postCount;
        private Long followingCount;
        private Long followerCount;
        private Long receivedLikeCount;
    }
}

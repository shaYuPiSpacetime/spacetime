package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 消息首页“喜欢我的人”摘要，与 PRD-02 使用同一有效关系和读取游标。 */
@Data
public class LikesMeSummaryVO {
    private Long totalCount;
    private Long newCount;
    private String latestAvatarUrl;
    private LocalDateTime latestLikedTime;
    /** clear=可清晰展示，blur=按未解锁样式展示。 */
    private String latestDisplayStatus;
}

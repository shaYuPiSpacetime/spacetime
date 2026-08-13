package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 消息首页悄悄话待处理摘要。 */
@Data
public class MessageWhisperSummaryVO {
    private Long pendingCount;
    private List<String> recentAvatarUrls;
}

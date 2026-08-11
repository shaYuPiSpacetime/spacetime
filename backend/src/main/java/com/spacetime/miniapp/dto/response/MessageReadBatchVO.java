package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 曝光批次已读确认结果。 */
@Data
public class MessageReadBatchVO {
    private List<String> acceptedNos;
    private Integer updatedCount;
    private MessageUnreadSummaryVO platformUnreadSummary;
}

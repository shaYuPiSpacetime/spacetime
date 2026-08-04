package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/** 举报目标的服务端可信上下文。 */
@Data
public class CommunityReportContextVO {
    private String summary;
    private String content;
    private List<String> imageUrls;
    private String sourceNo;
    private String conversationType;
    private String participantSummary;
    private Boolean available;
    private String unavailableReason;
}

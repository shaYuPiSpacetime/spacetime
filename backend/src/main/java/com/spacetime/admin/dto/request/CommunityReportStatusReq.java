package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/** 举报处理与处罚命令。 */
@Data
public class CommunityReportStatusReq {
    private String action;
    private String reason;
    @NotBlank private String result;
    private String punishAction;
    @NotNull private Integer version;
    @NotBlank private String handleRemark;
    private String mutePeriod;
    private String riskIp;
    private String ipBlockPeriod;
    private List<String> ipBlockScopes;
    private Boolean replyReporter;
    private String mergeIntoReportNo;
}

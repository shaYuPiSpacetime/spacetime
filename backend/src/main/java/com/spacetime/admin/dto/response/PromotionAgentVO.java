package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 代理响应
 */
@Data
public class PromotionAgentVO {
    private Long id;
    private String agentNo;
    private String agentName;
    private String contactName;
    private String contactPhone;
    private String school;
    private String campus;
    private String bonusRuleGroup;
    private String status;
    private String remark;
    private PromotionAgentStatVO stat;
    private LocalDateTime createTime;
}

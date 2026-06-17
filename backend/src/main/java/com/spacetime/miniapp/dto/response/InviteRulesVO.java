package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 活动规则响应。
 */
@Data
public class InviteRulesVO {
    private String successRule;
    private String rewardRule;
    private String riskRule;
    private String fallbackText;
}

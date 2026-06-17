package com.spacetime.admin.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 代理奖金规则保存请求。
 */
@Data
public class PromotionAgentBonusRuleSaveReq {
    private List<RuleGroup> ruleGroups;

    @Data
    public static class RuleGroup {
        private String groupCode;
        private String groupName;
        private Boolean enabled;
        private List<EventRule> events;
    }

    @Data
    public static class EventRule {
        private String eventType;
        private Boolean enabled;
        private BigDecimal amount;
    }
}

package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 推广规则配置聚合响应。
 */
@Data
public class PromotionRuleConfigVO {
    /** 普通用户邀请奖励规则 */
    private List<PromotionRuleVO> inviteRewardRules;
    /** 校园代理奖金规则 */
    private List<PromotionRuleVO> agentBonusRules;
    /** 风控参数规则 */
    private List<PromotionRuleVO> riskRules;
    /** 关系有效期说明 */
    private String relationValidityText;
}

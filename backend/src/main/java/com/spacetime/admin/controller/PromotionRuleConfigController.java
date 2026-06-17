package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.PromotionAgentBonusRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionInviteRewardRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionRiskConfigSaveReq;
import com.spacetime.admin.dto.response.PromotionRuleConfigVO;
import com.spacetime.admin.service.PromotionRuleAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 正式版推广规则配置控制器。
 */
@RestController
@RequestMapping("/admin/promotion/rule-config")
@RequiredArgsConstructor
public class PromotionRuleConfigController {
    private final PromotionRuleAdminService promotionRuleAdminService;

    /** 查询规则配置聚合详情。 */
    @GetMapping
    @RequirePermission("promotion:rule:list")
    public R<PromotionRuleConfigVO> config() {
        return R.ok(promotionRuleAdminService.config());
    }

    /** 保存普通邀请奖励配置。 */
    @PutMapping("/invite-reward")
    @RequirePermission("promotion:rule:edit")
    public R<Void> saveInviteReward(@Valid @RequestBody PromotionInviteRewardRuleSaveReq req) {
        promotionRuleAdminService.saveInviteReward(req);
        return R.ok();
    }

    /** 保存代理奖金规则配置。 */
    @PutMapping("/agent-bonus")
    @RequirePermission("promotion:rule:edit")
    public R<Void> saveAgentBonus(@Valid @RequestBody PromotionAgentBonusRuleSaveReq req) {
        promotionRuleAdminService.saveAgentBonus(req);
        return R.ok();
    }

    /** 保存风控配置。 */
    @PutMapping("/risk")
    @RequirePermission("promotion:rule:edit")
    public R<Void> saveRisk(@Valid @RequestBody PromotionRiskConfigSaveReq req) {
        promotionRuleAdminService.saveRiskConfig(req);
        return R.ok();
    }
}

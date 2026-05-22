package com.spacetime.admin.controller;

import com.spacetime.admin.service.PromotionAgentAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 代理码后台控制器
 */
@RestController
@RequestMapping("/admin/promotion/agent-codes")
@RequiredArgsConstructor
public class PromotionAgentCodeController {
    private final PromotionAgentAdminService promotionAgentAdminService;

    /** 停用代理码 */
    @PutMapping("/{id}/disable")
    @RequirePermission("promotion:agent:code")
    public R<Void> disable(@PathVariable Long id) {
        promotionAgentAdminService.disableCode(id);
        return R.ok();
    }
}

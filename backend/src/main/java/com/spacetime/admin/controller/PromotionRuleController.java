package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.PromotionRulePublishReq;
import com.spacetime.admin.dto.response.PromotionRuleConfigVO;
import com.spacetime.admin.service.PromotionAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 推广规则后台接口。
 */
@RestController
@RequestMapping("/admin/promotion/rules")
@RequiredArgsConstructor
public class PromotionRuleController {
    private final PromotionAdminService service;

    @GetMapping("/current")
    @RequirePermission("promotion:rule:view")
    public R<PromotionRuleConfigVO> current(@RequestParam String sourceType) {
        return R.ok(service.currentRule(sourceType));
    }

    @PostMapping("/publish")
    @RequirePermission("promotion:rule:view")
    public R<PromotionRuleConfigVO> publish(@Valid @RequestBody PromotionRulePublishReq req) {
        return R.ok(service.publishRule(req));
    }
}

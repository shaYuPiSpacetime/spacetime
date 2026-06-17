package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionRulePageReq;
import com.spacetime.admin.dto.request.PromotionRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionRuleTierReq;
import com.spacetime.admin.dto.request.PromotionStatusUpdateReq;
import com.spacetime.admin.dto.response.PromotionRuleConfigVO;
import com.spacetime.admin.dto.response.PromotionRuleVO;
import com.spacetime.admin.service.PromotionRuleAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 推广规则配置控制器
 */
@RestController
@RequestMapping("/admin/promotion/rules")
@RequiredArgsConstructor
public class PromotionRuleController {
    private final PromotionRuleAdminService promotionRuleAdminService;

    /** 分页查询推广规则 */
    @GetMapping("/list")
    @RequirePermission("promotion:rule:list")
    public R<Page<PromotionRuleVO>> list(@Valid PromotionRulePageReq req) {
        return R.ok(promotionRuleAdminService.list(req));
    }

    /** 查询正式版规则配置聚合详情 */
    @GetMapping("/config")
    @RequirePermission("promotion:rule:list")
    public R<PromotionRuleConfigVO> config() {
        return R.ok(promotionRuleAdminService.config());
    }

    /** 查询推广规则详情 */
    @GetMapping("/{id}")
    @RequirePermission("promotion:rule:list")
    public R<PromotionRuleVO> detail(@PathVariable Long id) {
        return R.ok(promotionRuleAdminService.detail(id));
    }

    /** 新增推广规则 */
    @PostMapping
    @RequirePermission("promotion:rule:add")
    public R<Long> create(@Valid @RequestBody PromotionRuleSaveReq req) {
        return R.ok(promotionRuleAdminService.create(req));
    }

    /** 编辑推广规则 */
    @PutMapping("/{id}")
    @RequirePermission("promotion:rule:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody PromotionRuleSaveReq req) {
        promotionRuleAdminService.update(id, req);
        return R.ok();
    }

    /** 启停推广规则 */
    @PutMapping("/{id}/status")
    @RequirePermission("promotion:rule:edit")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody PromotionStatusUpdateReq req) {
        promotionRuleAdminService.updateStatus(id, req.getStatus());
        return R.ok();
    }

    /** 保存阶梯规则 */
    @PutMapping("/{id}/tiers")
    @RequirePermission("promotion:rule:edit")
    public R<Void> saveTiers(@PathVariable Long id, @Valid @RequestBody List<PromotionRuleTierReq> tiers) {
        promotionRuleAdminService.saveTiers(id, tiers);
        return R.ok();
    }
}

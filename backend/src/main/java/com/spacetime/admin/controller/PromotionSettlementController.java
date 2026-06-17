package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionReviewReq;
import com.spacetime.admin.dto.request.PromotionSettlementPageReq;
import com.spacetime.admin.dto.request.PromotionSettlementPaidReq;
import com.spacetime.admin.dto.response.PromotionSettlementVO;
import com.spacetime.admin.service.PromotionSettlementAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;


/**
 * 代理结算后台控制器
 */
@RestController
@RequestMapping("/admin/promotion/settlements")
@RequiredArgsConstructor
public class PromotionSettlementController {
    private final PromotionSettlementAdminService promotionSettlementAdminService;

    /** 分页查询结算单 */
    @GetMapping("/list")
    @RequirePermission("promotion:settlement:list")
    public R<Page<PromotionSettlementVO>> list(@Valid PromotionSettlementPageReq req) {
        return R.ok(promotionSettlementAdminService.list(req));
    }

    /** 标记已确认 */
    @PutMapping("/{id}/confirm")
    @RequirePermission("promotion:settlement:confirm")
    public R<Void> confirm(@PathVariable Long id, @RequestBody PromotionReviewReq req) {
        promotionSettlementAdminService.confirm(id, req.getRemark());
        return R.ok();
    }

    /** 标记已发放 */
    @PutMapping("/{id}/paid")
    @RequirePermission("promotion:settlement:pay")
    public R<Void> paid(@PathVariable Long id, @Valid @RequestBody PromotionSettlementPaidReq req) {
        promotionSettlementAdminService.paid(id, req.getPaidAmount(), req.getRemark());
        return R.ok();
    }
}

package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionSettlementPageReq;
import com.spacetime.admin.dto.response.PromotionSettlementItemVO;
import com.spacetime.admin.dto.response.PromotionExportTaskVO;
import com.spacetime.admin.service.PromotionAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 校园推广员月度结算后台接口。
 */
@RestController
@RequestMapping("/admin/promotion/settlements")
@RequiredArgsConstructor
public class PromotionSettlementController {
    private final PromotionAdminService service;

    @GetMapping("/list")
    @RequirePermission("promotion:settlement:view")
    public R<Page<PromotionSettlementItemVO>> list(@Valid PromotionSettlementPageReq req) {
        return R.ok(service.settlements(req));
    }

    @PostMapping("/{settlementNo}/confirm")
    @RequirePermission("promotion:settlement:confirm")
    public R<PromotionSettlementItemVO> confirm(@PathVariable String settlementNo) {
        return R.ok(service.confirmSettlement(settlementNo));
    }

    @PostMapping("/export")
    @RequirePermission("promotion:settlement:export")
    public R<PromotionExportTaskVO> export(@Valid @RequestBody PromotionSettlementPageReq req) {
        return R.ok(service.exportSettlements(req));
    }
}

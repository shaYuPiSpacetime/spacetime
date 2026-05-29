package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.RefundPageReq;
import com.spacetime.admin.dto.response.TradeOrderVO;
import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 财务管理——退款订单控制器
 */
@RestController
@RequestMapping("/admin/finance/refunds")
@RequiredArgsConstructor
public class FinanceRefundController {
    private final FinanceAdminService financeAdminService;

    /** 分页查询退款订单 */
    @GetMapping("/list")
    @RequirePermission("finance:refund:list")
    public R<Page<TradeOrderVO>> list(@Valid RefundPageReq req) {
        return R.ok(financeAdminService.getRefundList(req));
    }
}

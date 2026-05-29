package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.OrderPageReq;
import com.spacetime.admin.dto.request.RefundReq;
import com.spacetime.admin.dto.response.TradeOrderDetailVO;
import com.spacetime.admin.dto.response.TradeOrderVO;
import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 财务管理——订单控制器
 */
@RestController
@RequestMapping("/admin/finance/orders")
@RequiredArgsConstructor
public class FinanceOrderController {
    private final FinanceAdminService financeAdminService;

    /** 分页查询订单列表 */
    @GetMapping("/list")
    @RequirePermission("finance:order:list")
    public R<Page<TradeOrderVO>> list(@Valid OrderPageReq req) {
        return R.ok(financeAdminService.getOrderList(req));
    }

    /** 查询订单详情 */
    @GetMapping("/{id}")
    @RequirePermission("finance:order:list")
    public R<TradeOrderDetailVO> detail(@PathVariable Long id) {
        return R.ok(financeAdminService.getOrderDetail(id));
    }

    /** 处理退款 */
    @PutMapping("/{id}/refund")
    @RequirePermission("finance:refund:process")
    public R<Void> refund(@PathVariable Long id, @Valid @RequestBody RefundReq req) {
        financeAdminService.processRefund(id, req);
        return R.ok();
    }
}

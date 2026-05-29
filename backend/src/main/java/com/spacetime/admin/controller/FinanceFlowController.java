package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.FlowPageReq;
import com.spacetime.admin.dto.response.CoinFlowVO;
import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 财务管理——成家币流水控制器
 */
@RestController
@RequestMapping("/admin/finance/flows")
@RequiredArgsConstructor
public class FinanceFlowController {
    private final FinanceAdminService financeAdminService;

    /** 分页查询成家币流水 */
    @GetMapping("/list")
    @RequirePermission("finance:flow:list")
    public R<Page<CoinFlowVO>> list(@Valid FlowPageReq req) {
        return R.ok(financeAdminService.getFlowList(req));
    }
}

package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.DailyStatsVO;
import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 财务管理——统计控制器
 */
@RestController
@RequestMapping("/admin/finance/stats")
@RequiredArgsConstructor
public class FinanceStatsController {
    private final FinanceAdminService financeAdminService;

    /** 按日统计交易数据 */
    @GetMapping("/daily")
    @RequirePermission("finance:stats:view")
    public R<DailyStatsVO> dailyStats(@RequestParam String date) {
        return R.ok(financeAdminService.getDailyStats(date));
    }
}

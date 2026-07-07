package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.DailyStatsVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.ReconcileDailyVO;
import com.spacetime.admin.service.FinanceAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 财务管理——统计控制器
 */
@RestController
@RequestMapping("/admin/finance")
@RequiredArgsConstructor
public class FinanceStatsController {
    /** 财务管理后台服务 */
    private final FinanceAdminService financeAdminService;

    /**
     * 按日统计交易数据
     * @param date 统计日期（格式 yyyy-MM-dd）
     * @return 当日统计数据
     */
    @GetMapping("/stats/daily")
    @RequirePermission("finance:stats:view")
    public R<DailyStatsVO> dailyStats(@RequestParam String date) {
        return R.ok(financeAdminService.getDailyStats(date));
    }

    /**
     * 查询轻量对账日汇总
     * @param date 统计日期（格式 yyyy-MM-dd）
     * @return 对账日汇总
     */
    @GetMapping("/reconcile/daily")
    @RequirePermission("finance:stats:view")
    public R<ReconcileDailyVO> reconcileDaily(@RequestParam String date) {
        return R.ok(financeAdminService.getReconcileDaily(date));
    }

    /**
     * 创建对账导出任务
     * @return 导出任务
     */
    @PostMapping("/reconcile/export")
    @RequirePermission("finance:stats:view")
    public R<ExportTaskVO> reconcileExport() {
        return R.ok(financeAdminService.createExportTask("commercial_reconcile"));
    }
}

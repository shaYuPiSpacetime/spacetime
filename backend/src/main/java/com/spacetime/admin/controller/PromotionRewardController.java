package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionRewardPageReq;
import com.spacetime.admin.dto.response.PromotionRewardItemVO;
import com.spacetime.admin.dto.response.PromotionExportTaskVO;
import com.spacetime.admin.service.PromotionAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * 普通与校园推广员奖励统一后台接口。
 */
@RestController
@RequestMapping("/admin/promotion/rewards")
@RequiredArgsConstructor
public class PromotionRewardController {
    private final PromotionAdminService service;

    @GetMapping("/list")
    @RequirePermission("promotion:reward:view")
    public R<Page<PromotionRewardItemVO>> list(@Valid PromotionRewardPageReq req) {
        return R.ok(service.rewards(req));
    }

    @PostMapping("/{rewardNo}/retry")
    @RequirePermission("promotion:reward:retry")
    public R<PromotionRewardItemVO> retry(@PathVariable String rewardNo) {
        return R.ok(service.retryReward(rewardNo));
    }

    @PostMapping("/export")
    @RequirePermission("promotion:reward:export")
    public R<PromotionExportTaskVO> export(@Valid @RequestBody PromotionRewardPageReq req) {
        return R.ok(service.exportRewards(req));
    }
}

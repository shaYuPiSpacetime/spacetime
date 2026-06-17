package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionRewardPageReq;
import com.spacetime.admin.dto.request.PromotionReviewReq;
import com.spacetime.admin.dto.response.PromotionRewardLogVO;
import com.spacetime.admin.service.PromotionRewardAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;


/**
 * 邀请奖励后台控制器
 */
@RestController
@RequiredArgsConstructor
public class PromotionRewardController {
    private final PromotionRewardAdminService promotionRewardAdminService;

    /** 分页查询奖励流水 */
    @GetMapping({"/admin/promotion/rewards/list", "/admin/promotion/invite-rewards/list"})
    @RequirePermission("promotion:reward:list")
    public R<Page<PromotionRewardLogVO>> list(@Valid PromotionRewardPageReq req) {
        return R.ok(promotionRewardAdminService.list(req));
    }

    /** 查询冻结奖励队列 */
    @GetMapping({"/admin/promotion/rewards/frozen", "/admin/promotion/invite-rewards/frozen/list"})
    @RequirePermission("promotion:reward:review")
    public R<Page<PromotionRewardLogVO>> frozen(@RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return R.ok(promotionRewardAdminService.frozen(page, size));
    }

    /** 确认有效并发放 */
    @PutMapping({"/admin/promotion/rewards/{id}/approve", "/admin/promotion/invite-rewards/{id}/approve"})
    @RequirePermission("promotion:reward:review")
    public R<Void> approve(@PathVariable Long id, @RequestBody PromotionReviewReq req) {
        promotionRewardAdminService.approve(id, req.getRemark());
        return R.ok();
    }

    /** 确认无效并作废 */
    @PutMapping({"/admin/promotion/rewards/{id}/reject", "/admin/promotion/invite-rewards/{id}/reject"})
    @RequirePermission("promotion:reward:review")
    public R<Void> reject(@PathVariable Long id, @RequestBody PromotionReviewReq req) {
        promotionRewardAdminService.reject(id, req.getRemark());
        return R.ok();
    }
}

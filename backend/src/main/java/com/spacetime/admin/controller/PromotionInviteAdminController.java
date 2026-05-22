package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionInvitePageReq;
import com.spacetime.admin.dto.request.PromotionReviewReq;
import com.spacetime.admin.dto.response.PromotionInviteRelationVO;
import com.spacetime.admin.service.PromotionInviteAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;


/**
 * 普通邀请关系后台控制器
 */
@RestController
@RequestMapping("/admin/promotion/invites")
@RequiredArgsConstructor
public class PromotionInviteAdminController {
    private final PromotionInviteAdminService promotionInviteAdminService;

    /** 分页查询邀请关系 */
    @GetMapping("/list")
    @RequirePermission("promotion:invite:list")
    public R<Page<PromotionInviteRelationVO>> list(@Valid PromotionInvitePageReq req) {
        return R.ok(promotionInviteAdminService.list(req));
    }

    /** 查询邀请关系详情 */
    @GetMapping("/{id}")
    @RequirePermission("promotion:invite:list")
    public R<PromotionInviteRelationVO> detail(@PathVariable Long id) {
        return R.ok(promotionInviteAdminService.detail(id));
    }

    /** 人工标记无效 */
    @PutMapping("/{id}/invalid")
    @RequirePermission("promotion:invite:review")
    public R<Void> markInvalid(@PathVariable Long id, @RequestBody PromotionReviewReq req) {
        promotionInviteAdminService.markInvalid(id, req.getRemark());
        return R.ok();
    }

    /** 人工解除冻结 */
    @PutMapping("/{id}/unfreeze")
    @RequirePermission("promotion:invite:review")
    public R<Void> unfreeze(@PathVariable Long id, @RequestBody PromotionReviewReq req) {
        promotionInviteAdminService.unfreeze(id, req.getRemark());
        return R.ok();
    }
}

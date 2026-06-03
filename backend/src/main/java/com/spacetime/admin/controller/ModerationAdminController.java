package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.ModerationVO;
import com.spacetime.admin.service.ModerationAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 管理后台 — 资料内容审核接口
 * 覆盖照片审核与开放性文字审核的列表查询与审核操作
 */
@RestController
@RequestMapping("/admin/moderation")
@RequiredArgsConstructor
public class ModerationAdminController {

    private final ModerationAdminService moderationAdminService;

    /**
     * 照片审核分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据
     */
    @GetMapping("/photos/list")
    @RequirePermission("moderation:photo:list")
    public R<Page<ModerationVO>> photoPage(@Valid VerificationPageReq req) {
        return R.ok(moderationAdminService.getPhotoPage(req));
    }

    /**
     * 文字审核分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据
     */
    @GetMapping("/texts/list")
    @RequirePermission("moderation:text:list")
    public R<Page<ModerationVO>> textPage(@Valid VerificationPageReq req) {
        return R.ok(moderationAdminService.getTextPage(req));
    }

    /**
     * 照片审核（通过/驳回）
     * @param id 审核记录ID
     * @param req 审核动作与驳回原因
     */
    @PostMapping("/photos/{id}/audit")
    @RequirePermission("moderation:photo:audit")
    public R<Void> auditPhoto(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        moderationAdminService.auditPhoto(id, req);
        return R.ok();
    }

    /**
     * 文字审核（通过/驳回）
     * @param id 审核记录ID
     * @param req 审核动作与驳回原因
     */
    @PostMapping("/texts/{id}/audit")
    @RequirePermission("moderation:text:audit")
    public R<Void> auditText(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        moderationAdminService.auditText(id, req);
        return R.ok();
    }
}

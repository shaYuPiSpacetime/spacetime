package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.ModerationDetailVO;
import com.spacetime.admin.dto.response.ModerationVO;
import com.spacetime.admin.service.ModerationAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 管理后台 — 内容审核管理控制器
 * 含资料照片审核与文字内容审核两个模块，每个模块含分页列表/详情/审核操作
 */
@RestController
@RequestMapping("/admin/moderation")
@RequiredArgsConstructor
public class ModerationAdminController {

    private final ModerationAdminService moderationAdminService;

    /** 照片审核分页列表 */
    @GetMapping("/photos/list")
    @RequirePermission("moderation:photo:list")
    public R<Page<ModerationVO>> photoPage(@Valid VerificationPageReq req) {
        return R.ok(moderationAdminService.getPhotoPage(req));
    }

    /** 文字审核分页列表 */
    @GetMapping("/texts/list")
    @RequirePermission("moderation:text:list")
    public R<Page<ModerationVO>> textPage(@Valid VerificationPageReq req) {
        return R.ok(moderationAdminService.getTextPage(req));
    }

    /** 照片审核详情（含原图全尺寸URL） */
    @GetMapping("/photos/{id}")
    @RequirePermission("moderation:photo:list")
    public R<ModerationDetailVO> photoDetail(@PathVariable Long id) {
        return R.ok(moderationAdminService.getPhotoDetail(id));
    }

    /** 文字审核详情（含文本全文不截断） */
    @GetMapping("/texts/{id}")
    @RequirePermission("moderation:text:list")
    public R<ModerationDetailVO> textDetail(@PathVariable Long id) {
        return R.ok(moderationAdminService.getTextDetail(id));
    }

    /** 照片审核操作（通过/驳回） */
    @PostMapping("/photos/{id}/audit")
    @RequirePermission("moderation:photo:audit")
    public R<Void> auditPhoto(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        moderationAdminService.auditPhoto(id, req);
        return R.ok();
    }

    /** 文字审核操作（通过/驳回） */
    @PostMapping("/texts/{id}/audit")
    @RequirePermission("moderation:text:audit")
    public R<Void> auditText(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        moderationAdminService.auditText(id, req);
        return R.ok();
    }
}

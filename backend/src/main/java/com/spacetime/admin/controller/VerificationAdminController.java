package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.VerificationVO;
import com.spacetime.admin.service.VerificationAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 管理后台 — 认证审核接口
 * 覆盖实名认证、学历认证、头像认证的列表查询与审核操作
 */
@RestController
@RequestMapping("/admin/verify")
@RequiredArgsConstructor
public class VerificationAdminController {

    private final VerificationAdminService verificationAdminService;

    /**
     * 实名认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据
     */
    @GetMapping("/real-name/list")
    @RequirePermission("verify:realname:list")
    public R<Page<VerificationVO>> realNamePage(@Valid VerificationPageReq req) {
        return R.ok(verificationAdminService.getRealNamePage(req));
    }

    /**
     * 学历认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据
     */
    @GetMapping("/education/list")
    @RequirePermission("verify:education:list")
    public R<Page<VerificationVO>> educationPage(@Valid VerificationPageReq req) {
        return R.ok(verificationAdminService.getEducationPage(req));
    }

    /**
     * 头像认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据
     */
    @GetMapping("/avatar/list")
    @RequirePermission("verify:avatar:list")
    public R<Page<VerificationVO>> avatarPage(@Valid VerificationPageReq req) {
        return R.ok(verificationAdminService.getAvatarPage(req));
    }

    /**
     * 实名认证审核（通过/驳回）
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    @PostMapping("/real-name/{id}/audit")
    @RequirePermission("verify:realname:audit")
    public R<Void> auditRealName(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        verificationAdminService.auditRealName(id, req);
        return R.ok();
    }

    /**
     * 学历认证审核（通过/驳回）
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    @PostMapping("/education/{id}/audit")
    @RequirePermission("verify:education:audit")
    public R<Void> auditEducation(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        verificationAdminService.auditEducation(id, req);
        return R.ok();
    }

    /**
     * 头像认证审核（通过/驳回）
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    @PostMapping("/avatar/{id}/audit")
    @RequirePermission("verify:avatar:audit")
    public R<Void> auditAvatar(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        verificationAdminService.auditAvatar(id, req);
        return R.ok();
    }
}

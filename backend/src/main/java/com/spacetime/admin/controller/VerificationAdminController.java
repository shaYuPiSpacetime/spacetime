package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.VerificationAuditDetailVO;
import com.spacetime.admin.dto.response.VerificationVO;
import com.spacetime.admin.service.VerificationAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 管理后台 — 用户认证审核管理控制器
 * 含实名认证/学历认证/头像认证三个模块，每个模块含分页列表/详情/审核操作
 */
@RestController
@RequestMapping("/admin/verify")
@RequiredArgsConstructor
public class VerificationAdminController {

    private final VerificationAdminService verificationAdminService;

    /** 实名认证审核分页列表 */
    @GetMapping("/real-name/list")
    @RequirePermission("verify:realname:list")
    public R<Page<VerificationVO>> realNamePage(@Valid VerificationPageReq req) {
        return R.ok(verificationAdminService.getRealNamePage(req));
    }

    /** 学历认证审核分页列表 */
    @GetMapping("/education/list")
    @RequirePermission("verify:education:list")
    public R<Page<VerificationVO>> educationPage(@Valid VerificationPageReq req) {
        return R.ok(verificationAdminService.getEducationPage(req));
    }

    /** 头像认证审核分页列表 */
    @GetMapping("/avatar/list")
    @RequirePermission("verify:avatar:list")
    public R<Page<VerificationVO>> avatarPage(@Valid VerificationPageReq req) {
        return R.ok(verificationAdminService.getAvatarPage(req));
    }

    /** 实名认证审核详情（含脱敏姓名/身份证号） */
    @GetMapping("/real-name/{id}")
    @RequirePermission("verify:realname:list")
    public R<VerificationAuditDetailVO> realNameDetail(@PathVariable Long id) {
        return R.ok(verificationAdminService.getRealNameDetail(id));
    }

    /** 学历认证审核详情（含学校/认证方式/材料摘要） */
    @GetMapping("/education/{id}")
    @RequirePermission("verify:education:list")
    public R<VerificationAuditDetailVO> educationDetail(@PathVariable Long id) {
        return R.ok(verificationAdminService.getEducationDetail(id));
    }

    /** 头像认证审核详情（含头像URL/历史记录） */
    @GetMapping("/avatar/{id}")
    @RequirePermission("verify:avatar:list")
    public R<VerificationAuditDetailVO> avatarDetail(@PathVariable Long id) {
        return R.ok(verificationAdminService.getAvatarDetail(id));
    }

    /** 实名认证审核操作（通过/驳回） */
    @PostMapping("/real-name/{id}/audit")
    @RequirePermission("verify:realname:audit")
    public R<Void> auditRealName(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        verificationAdminService.auditRealName(id, req);
        return R.ok();
    }

    /** 学历认证审核操作（通过/驳回） */
    @PostMapping("/education/{id}/audit")
    @RequirePermission("verify:education:audit")
    public R<Void> auditEducation(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        verificationAdminService.auditEducation(id, req);
        return R.ok();
    }

    /** 头像认证审核操作（通过/驳回） */
    @PostMapping("/avatar/{id}/audit")
    @RequirePermission("verify:avatar:audit")
    public R<Void> auditAvatar(@PathVariable Long id, @Valid @RequestBody ModerationAuditReq req) {
        verificationAdminService.auditAvatar(id, req);
        return R.ok();
    }
}

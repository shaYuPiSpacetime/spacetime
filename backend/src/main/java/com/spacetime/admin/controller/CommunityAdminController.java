package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.AppConfigVO;
import com.spacetime.admin.dto.response.CommunityCommentAdminVO;
import com.spacetime.admin.dto.response.CommunityPostAdminVO;
import com.spacetime.admin.dto.response.CommunityReportAdminVO;
import com.spacetime.admin.dto.response.MobileEntryConfigVO;
import com.spacetime.admin.service.CommunityAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 后台社区管理控制器
 */
@RestController
@RequestMapping("/admin/community")
@RequiredArgsConstructor
public class CommunityAdminController {

    private final CommunityAdminService communityAdminService;

    @GetMapping("/posts/list")
    @RequirePermission("community:post:list")
    public R<Page<CommunityPostAdminVO>> posts(@Valid CommunityPostPageReq req) {
        return R.ok(communityAdminService.getPostPage(req));
    }

    @GetMapping("/posts/{id}")
    @RequirePermission("community:post:list")
    public R<CommunityPostAdminVO> postDetail(@PathVariable Long id) {
        return R.ok(communityAdminService.getPostDetail(id));
    }

    @PutMapping("/posts/{id}/audit")
    @RequirePermission("community:post:audit")
    public R<Void> auditPost(@PathVariable Long id, @Valid @RequestBody CommunityPostAuditReq req) {
        communityAdminService.auditPost(id, req);
        return R.ok();
    }

    @GetMapping("/comments/list")
    @RequirePermission("community:comment:list")
    public R<Page<CommunityCommentAdminVO>> comments(@Valid CommunityCommentPageReq req) {
        return R.ok(communityAdminService.getCommentPage(req));
    }

    @PutMapping("/comments/{id}/audit")
    @RequirePermission("community:comment:audit")
    public R<Void> auditComment(@PathVariable Long id, @Valid @RequestBody CommunityCommentAuditReq req) {
        communityAdminService.auditComment(id, req);
        return R.ok();
    }

    @GetMapping("/reports/list")
    @RequirePermission("community:report:list")
    public R<Page<CommunityReportAdminVO>> reports(@Valid CommunityReportPageReq req) {
        return R.ok(communityAdminService.getReportPage(req));
    }

    @PutMapping("/reports/{id}/handle")
    @RequirePermission("community:report:handle")
    public R<Void> handleReport(@PathVariable Long id, @Valid @RequestBody CommunityReportHandleReq req) {
        communityAdminService.handleReport(id, req);
        return R.ok();
    }

    @GetMapping("/configs")
    @RequirePermission("community:config:list")
    public R<List<AppConfigVO>> configs() {
        return R.ok(communityAdminService.getCommunityConfigs());
    }

    @PostMapping("/configs")
    @RequirePermission("community:config:edit")
    public R<Void> saveConfigs(@Valid @RequestBody AppConfigBatchReq req) {
        communityAdminService.saveCommunityConfigs(req);
        return R.ok();
    }

    @GetMapping("/home-tabs")
    @RequirePermission("community:config:list")
    public R<List<MobileEntryConfigVO>> homeTabs() {
        return R.ok(communityAdminService.getHomeTabs());
    }
}

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

    /** 社区管理后台服务 */
    private final CommunityAdminService communityAdminService;

    /**
     * 分页查询动态列表
     * @param req 动态分页查询请求
     * @return 动态分页数据
     */
    @GetMapping("/posts/list")
    @RequirePermission("community:post:list")
    public R<Page<CommunityPostAdminVO>> posts(@Valid CommunityPostPageReq req) {
        return R.ok(communityAdminService.getPostPage(req));
    }

    /**
     * 查询动态详情
     * @param id 动态ID
     * @return 动态详情
     */
    @GetMapping("/posts/{id}")
    @RequirePermission("community:post:list")
    public R<CommunityPostAdminVO> postDetail(@PathVariable Long id) {
        return R.ok(communityAdminService.getPostDetail(id));
    }

    /**
     * 审核动态
     * @param id 动态ID
     * @param req 审核请求
     * @return 空响应
     */
    @PutMapping("/posts/{id}/audit")
    @RequirePermission("community:post:audit")
    public R<Void> auditPost(@PathVariable Long id, @Valid @RequestBody CommunityPostAuditReq req) {
        communityAdminService.auditPost(id, req);
        return R.ok();
    }

    /**
     * 分页查询评论列表
     * @param req 评论分页查询请求
     * @return 评论分页数据
     */
    @GetMapping("/comments/list")
    @RequirePermission("community:comment:list")
    public R<Page<CommunityCommentAdminVO>> comments(@Valid CommunityCommentPageReq req) {
        return R.ok(communityAdminService.getCommentPage(req));
    }

    /**
     * 审核评论
     * @param id 评论ID
     * @param req 审核请求
     * @return 空响应
     */
    @PutMapping("/comments/{id}/audit")
    @RequirePermission("community:comment:audit")
    public R<Void> auditComment(@PathVariable Long id, @Valid @RequestBody CommunityCommentAuditReq req) {
        communityAdminService.auditComment(id, req);
        return R.ok();
    }

    /**
     * 分页查询举报列表
     * @param req 举报分页查询请求
     * @return 举报分页数据
     */
    @GetMapping("/reports/list")
    @RequirePermission("community:report:list")
    public R<Page<CommunityReportAdminVO>> reports(@Valid CommunityReportPageReq req) {
        return R.ok(communityAdminService.getReportPage(req));
    }

    /**
     * 处理举报
     * @param id 举报ID
     * @param req 举报处理请求
     * @return 空响应
     */
    @PutMapping("/reports/{id}/handle")
    @RequirePermission("community:report:handle")
    public R<Void> handleReport(@PathVariable Long id, @Valid @RequestBody CommunityReportHandleReq req) {
        communityAdminService.handleReport(id, req);
        return R.ok();
    }

    /**
     * 查询社区配置列表
     * @return 配置列表
     */
    @GetMapping("/configs")
    @RequirePermission("community:config:list")
    public R<List<AppConfigVO>> configs() {
        return R.ok(communityAdminService.getCommunityConfigs());
    }

    /**
     * 批量保存社区配置
     * @param req 配置批量保存请求
     * @return 空响应
     */
    @PostMapping("/configs")
    @RequirePermission("community:config:edit")
    public R<Void> saveConfigs(@Valid @RequestBody AppConfigBatchReq req) {
        communityAdminService.saveCommunityConfigs(req);
        return R.ok();
    }

    /**
     * 查询社区首页Tab配置
     * @return 移动端入口配置列表
     */
    @GetMapping("/home-tabs")
    @RequirePermission("community:config:list")
    public R<List<MobileEntryConfigVO>> homeTabs() {
        return R.ok(communityAdminService.getHomeTabs());
    }
}

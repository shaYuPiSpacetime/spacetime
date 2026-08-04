package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.*;
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

    @GetMapping("/meta")
    public R<CommunityAdminMetaVO> meta() {
        return R.ok(communityAdminService.getMeta());
    }

    @GetMapping("/posts/stats")
    @RequirePermission("community:post:list")
    public R<CommunityStatsVO> postStats(@RequestParam(defaultValue = "content") String scope) {
        return R.ok(communityAdminService.getPostStats(scope));
    }

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

    @PutMapping("/posts/{id}/status")
    @RequirePermission("community:post:audit")
    public R<Void> updatePostStatus(@PathVariable Long id, @Valid @RequestBody CommunityStatusCommandReq req) {
        communityAdminService.updatePostStatus(id, req);
        return R.ok();
    }

    @PostMapping("/exports")
    @RequirePermission("community:export:create")
    public R<CommunityExportTaskVO> createExport(@Valid @RequestBody CommunityExportCreateReq req) {
        return R.ok(communityAdminService.createExport(req));
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

    @GetMapping("/comments/stats")
    @RequirePermission("community:comment:list")
    public R<CommunityStatsVO> commentStats() {
        return R.ok(communityAdminService.getCommentStats());
    }

    @GetMapping("/comments/{id}")
    @RequirePermission("community:comment:list")
    public R<CommunityCommentAdminVO> commentDetail(@PathVariable Long id) {
        return R.ok(communityAdminService.getCommentDetail(id));
    }

    @PutMapping("/comments/{id}/status")
    @RequirePermission("community:comment:manage")
    public R<Void> updateCommentStatus(@PathVariable Long id, @Valid @RequestBody CommunityStatusCommandReq req) {
        communityAdminService.updateCommentStatus(id, req);
        return R.ok();
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

    @GetMapping("/reports/stats")
    @RequirePermission("community:report:list")
    public R<CommunityStatsVO> reportStats() {
        return R.ok(communityAdminService.getReportStats());
    }

    @GetMapping("/reports/{id}")
    @RequirePermission("community:report:list")
    public R<CommunityReportAdminVO> reportDetail(@PathVariable Long id) {
        return R.ok(communityAdminService.getReportDetail(id));
    }

    @PutMapping("/reports/{id}/status")
    @RequirePermission("community:report:handle")
    public R<Void> updateReportStatus(@PathVariable Long id, @Valid @RequestBody CommunityReportStatusReq req) {
        communityAdminService.updateReportStatus(id, req);
        return R.ok();
    }

    @GetMapping("/topics/stats")
    @RequirePermission("community:topic:list")
    public R<CommunityStatsVO> topicStats() {
        return R.ok(communityAdminService.getTopicStats());
    }

    @GetMapping("/topics/list")
    @RequirePermission("community:topic:list")
    public R<Page<CommunityTopicAdminVO>> topics(@Valid CommunityTopicPageReq req) {
        return R.ok(communityAdminService.getTopicPage(req));
    }

    @GetMapping("/topics/{id}")
    @RequirePermission("community:topic:list")
    public R<CommunityTopicAdminVO> topicDetail(@PathVariable Long id) {
        return R.ok(communityAdminService.getTopicDetail(id));
    }

    @PostMapping("/topics")
    @RequirePermission("community:topic:manage")
    public R<CommunityTopicAdminVO> createTopic(@Valid @RequestBody CommunityTopicSaveReq req) {
        return R.ok(communityAdminService.createTopic(req));
    }

    @PutMapping("/topics/{id}")
    @RequirePermission("community:topic:manage")
    public R<CommunityTopicAdminVO> updateTopic(@PathVariable Long id, @Valid @RequestBody CommunityTopicSaveReq req) {
        return R.ok(communityAdminService.updateTopic(id, req));
    }

    @PutMapping("/topics/{id}/status")
    @RequirePermission("community:topic:manage")
    public R<Void> updateTopicStatus(@PathVariable Long id, @Valid @RequestBody CommunityTopicStatusReq req) {
        communityAdminService.updateTopicStatus(id, req);
        return R.ok();
    }

    @PostMapping("/topics/cover-upload-ticket")
    @RequirePermission("community:topic:manage")
    public R<CommunityOssTicketVO> createTopicCoverTicket(@Valid @RequestBody CommunityCoverTicketReq req) {
        return R.ok(communityAdminService.createTopicCoverTicket(req));
    }

    @GetMapping("/configs/version")
    @RequirePermission("community:config:view")
    public R<CommunityConfigVersionVO> configVersion() {
        return R.ok(communityAdminService.getConfigVersion());
    }

    @PostMapping("/configs/version")
    @RequirePermission("community:config:edit")
    public R<CommunityConfigVersionVO> saveConfigVersion(@Valid @RequestBody CommunityConfigVersionSaveReq req) {
        return R.ok(communityAdminService.saveConfigVersion(req));
    }

    @GetMapping("/configs/logs")
    @RequirePermission("community:config:view")
    public R<List<CommunityAuditLogVO>> configLogs() {
        return R.ok(communityAdminService.getConfigLogs());
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

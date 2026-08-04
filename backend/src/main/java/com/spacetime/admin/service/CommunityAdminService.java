package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.*;

import java.util.List;

/**
 * 后台社区管理服务
 */
public interface CommunityAdminService {
    CommunityAdminMetaVO getMeta();

    CommunityStatsVO getPostStats(String scope);

    /**
     * 分页查询动态列表
     * @param req 动态分页查询请求
     * @return 动态分页数据
     */
    Page<CommunityPostAdminVO> getPostPage(CommunityPostPageReq req);

    /**
     * 查询动态详情
     * @param id 动态ID
     * @return 动态详情（含作者信息）
     */
    CommunityPostAdminVO getPostDetail(Long id);

    void updatePostStatus(Long id, CommunityStatusCommandReq req);

    /**
     * 审核动态（通过/驳回）
     * @param id 动态ID
     * @param req 审核请求
     */
    void auditPost(Long id, CommunityPostAuditReq req);

    /**
     * 分页查询评论列表
     * @param req 评论分页查询请求
     * @return 评论分页数据
     */
    Page<CommunityCommentAdminVO> getCommentPage(CommunityCommentPageReq req);

    CommunityStatsVO getCommentStats();

    CommunityCommentAdminVO getCommentDetail(Long id);

    void updateCommentStatus(Long id, CommunityStatusCommandReq req);

    /**
     * 审核评论（通过/驳回）
     * @param id 评论ID
     * @param req 审核请求
     */
    void auditComment(Long id, CommunityCommentAuditReq req);

    /**
     * 分页查询举报列表
     * @param req 举报分页查询请求
     * @return 举报分页数据
     */
    Page<CommunityReportAdminVO> getReportPage(CommunityReportPageReq req);

    CommunityStatsVO getReportStats();

    CommunityReportAdminVO getReportDetail(Long id);

    void updateReportStatus(Long id, CommunityReportStatusReq req);

    CommunityStatsVO getTopicStats();

    Page<CommunityTopicAdminVO> getTopicPage(CommunityTopicPageReq req);

    CommunityTopicAdminVO getTopicDetail(Long id);

    CommunityTopicAdminVO createTopic(CommunityTopicSaveReq req);

    CommunityTopicAdminVO updateTopic(Long id, CommunityTopicSaveReq req);

    void updateTopicStatus(Long id, CommunityTopicStatusReq req);

    CommunityOssTicketVO createTopicCoverTicket(CommunityCoverTicketReq req);

    CommunityExportTaskVO createExport(CommunityExportCreateReq req);

    CommunityConfigVersionVO getConfigVersion();

    CommunityConfigVersionVO saveConfigVersion(CommunityConfigVersionSaveReq req);

    List<CommunityAuditLogVO> getConfigLogs();

    /**
     * 处理举报（校验状态、设置处理信息、执行处理动作、更新举报单、记录日志）
     * @param id 举报ID
     * @param req 举报处理请求
     */
    void handleReport(Long id, CommunityReportHandleReq req);

    /**
     * 查询社区配置列表
     * @return 配置列表
     */
    List<AppConfigVO> getCommunityConfigs();

    /**
     * 批量保存社区配置
     * @param req 配置批量保存请求
     */
    void saveCommunityConfigs(AppConfigBatchReq req);

    /**
     * 查询社区首页Tab配置
     * @return 移动端入口配置列表
     */
    List<MobileEntryConfigVO> getHomeTabs();
}

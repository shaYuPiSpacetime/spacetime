package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.AppConfigVO;
import com.spacetime.admin.dto.response.CommunityCommentAdminVO;
import com.spacetime.admin.dto.response.CommunityPostAdminVO;
import com.spacetime.admin.dto.response.CommunityReportAdminVO;
import com.spacetime.admin.dto.response.MobileEntryConfigVO;

import java.util.List;

/**
 * 后台社区管理服务
 */
public interface CommunityAdminService {
    Page<CommunityPostAdminVO> getPostPage(CommunityPostPageReq req);
    CommunityPostAdminVO getPostDetail(Long id);
    void auditPost(Long id, CommunityPostAuditReq req);
    Page<CommunityCommentAdminVO> getCommentPage(CommunityCommentPageReq req);
    void auditComment(Long id, CommunityCommentAuditReq req);
    Page<CommunityReportAdminVO> getReportPage(CommunityReportPageReq req);
    void handleReport(Long id, CommunityReportHandleReq req);
    List<AppConfigVO> getCommunityConfigs();
    void saveCommunityConfigs(AppConfigBatchReq req);
    List<MobileEntryConfigVO> getHomeTabs();
}

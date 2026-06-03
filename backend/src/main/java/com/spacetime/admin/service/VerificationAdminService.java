package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.VerificationVO;

/**
 * 管理后台 — 认证审核服务
 * 覆盖实名认证、学历认证、头像认证的列表查询与审核操作
 */
public interface VerificationAdminService {
    /**
     * 实名认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像和昵称）
     */
    Page<VerificationVO> getRealNamePage(VerificationPageReq req);

    /**
     * 学历认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像和昵称）
     */
    Page<VerificationVO> getEducationPage(VerificationPageReq req);

    /**
     * 头像认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像和昵称）
     */
    Page<VerificationVO> getAvatarPage(VerificationPageReq req);

    /**
     * 实名认证审核（通过/驳回）
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    void auditRealName(Long id, ModerationAuditReq req);

    /**
     * 学历认证审核（通过/驳回）
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    void auditEducation(Long id, ModerationAuditReq req);

    /**
     * 头像认证审核（通过/驳回）
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    void auditAvatar(Long id, ModerationAuditReq req);
}

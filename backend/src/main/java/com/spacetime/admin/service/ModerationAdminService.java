package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.ModerationVO;

/**
 * 管理后台 — 资料内容审核服务
 * 覆盖照片审核与开放性文字审核的列表查询与审核操作
 */
public interface ModerationAdminService {
    /**
     * 照片审核分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像、昵称、照片预览）
     */
    Page<ModerationVO> getPhotoPage(VerificationPageReq req);

    /**
     * 文字审核分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像、昵称、文字预览）
     */
    Page<ModerationVO> getTextPage(VerificationPageReq req);

    /**
     * 照片审核（通过/驳回）
     * @param id 审核记录ID
     * @param req 审核动作与驳回原因
     */
    void auditPhoto(Long id, ModerationAuditReq req);

    /**
     * 文字审核（通过/驳回）
     * @param id 审核记录ID
     * @param req 审核动作与驳回原因
     */
    void auditText(Long id, ModerationAuditReq req);
}

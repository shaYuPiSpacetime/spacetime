package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.VerificationAuditDetailVO;
import com.spacetime.admin.dto.response.VerificationVO;

/**
 * 管理后台 — 用户认证审核服务接口
 * 含实名认证/学历认证/头像认证三类审核的分页、详情与审核操作
 */
public interface VerificationAdminService {

    /** 实名认证分页列表 */
    Page<VerificationVO> getRealNamePage(VerificationPageReq req);

    /** 学历认证分页列表 */
    Page<VerificationVO> getEducationPage(VerificationPageReq req);

    /** 头像认证分页列表 */
    Page<VerificationVO> getAvatarPage(VerificationPageReq req);

    /** 实名认证详情（含脱敏字段） */
    VerificationAuditDetailVO getRealNameDetail(Long id);

    /** 学历认证详情 */
    VerificationAuditDetailVO getEducationDetail(Long id);

    /** 头像认证详情 */
    VerificationAuditDetailVO getAvatarDetail(Long id);

    /** 实名认证审核 */
    void auditRealName(Long id, ModerationAuditReq req);

    /** 学历认证审核 */
    void auditEducation(Long id, ModerationAuditReq req);

    /** 头像认证审核 */
    void auditAvatar(Long id, ModerationAuditReq req);
}

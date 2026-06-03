package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.ModerationDetailVO;
import com.spacetime.admin.dto.response.ModerationVO;

/**
 * 管理后台 — 内容审核服务接口
 * 含资料照片审核与文字内容审核两个模块的分页、详情与审核操作
 */
public interface ModerationAdminService {

    /** 照片审核分页列表 */
    Page<ModerationVO> getPhotoPage(VerificationPageReq req);

    /** 文字审核分页列表 */
    Page<ModerationVO> getTextPage(VerificationPageReq req);

    /** 照片审核详情（含原图URL） */
    ModerationDetailVO getPhotoDetail(Long id);

    /** 文字审核详情（含全文） */
    ModerationDetailVO getTextDetail(Long id);

    /** 照片审核操作 */
    void auditPhoto(Long id, ModerationAuditReq req);

    /** 文字审核操作 */
    void auditText(Long id, ModerationAuditReq req);
}

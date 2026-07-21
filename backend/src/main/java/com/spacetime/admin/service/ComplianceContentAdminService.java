package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ComplianceContentPageReq;
import com.spacetime.admin.dto.request.ComplianceContentSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.ComplianceContentVO;

/**
 * 公告与协议预置内容管理服务。
 */
public interface ComplianceContentAdminService {
    /** 查询全部预置内容。 */
    Page<ComplianceContentVO> list(ComplianceContentPageReq req);

    /** 查询预置内容详情。 */
    ComplianceContentVO detail(Long id);

    /** 仅编辑标题、H5 地址和状态。 */
    void update(Long id, ComplianceContentSaveReq req);

    /** 单独启停预置内容，版本保持不变。 */
    void updateStatus(Long id, StatusUpdateReq req);
}

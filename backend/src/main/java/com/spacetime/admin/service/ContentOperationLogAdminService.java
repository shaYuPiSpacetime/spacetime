package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ContentOperationLogPageReq;
import com.spacetime.admin.dto.response.ContentOperationLogVO;

/**
 * 内容操作日志管理服务接口
 */
public interface ContentOperationLogAdminService {
    /**
     * 分页查询操作日志
     *
     * @param req 分页查询条件
     * @return 分页结果
     */
    Page<ContentOperationLogVO> list(ContentOperationLogPageReq req);
}

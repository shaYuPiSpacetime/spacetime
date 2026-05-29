package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SearchBlockWordPageReq;
import com.spacetime.admin.dto.request.SearchBlockWordSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.SearchBlockWordVO;

/**
 * 搜索屏蔽词管理服务接口
 */
public interface SearchBlockWordAdminService {
    /**
     * 分页查询屏蔽词列表
     *
     * @param req 分页查询条件
     * @return 分页结果
     */
    Page<SearchBlockWordVO> list(SearchBlockWordPageReq req);

    /**
     * 创建屏蔽词
     *
     * @param req 创建请求
     * @return 新屏蔽词 ID
     */
    Long create(SearchBlockWordSaveReq req);

    /**
     * 更新屏蔽词
     *
     * @param id  屏蔽词 ID
     * @param req 更新请求
     */
    void update(Long id, SearchBlockWordSaveReq req);

    /**
     * 更新屏蔽词状态
     *
     * @param id  屏蔽词 ID
     * @param req 状态变更请求
     */
    void updateStatus(Long id, StatusUpdateReq req);

    /**
     * 删除屏蔽词
     *
     * @param id 屏蔽词 ID
     */
    void delete(Long id);
}

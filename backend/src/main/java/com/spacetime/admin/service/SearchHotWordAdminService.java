package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SearchHotWordPageReq;
import com.spacetime.admin.dto.request.SearchHotWordSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.SearchHotWordVO;

/**
 * 搜索热词管理服务接口
 */
public interface SearchHotWordAdminService {
    /**
     * 分页查询热词列表
     *
     * @param req 分页查询条件
     * @return 分页结果
     */
    Page<SearchHotWordVO> list(SearchHotWordPageReq req);

    /**
     * 创建热词
     *
     * @param req 创建请求
     * @return 新热词 ID
     */
    Long create(SearchHotWordSaveReq req);

    /**
     * 更新热词
     *
     * @param id  热词 ID
     * @param req 更新请求
     */
    void update(Long id, SearchHotWordSaveReq req);

    /**
     * 更新热词状态
     *
     * @param id  热词 ID
     * @param req 状态变更请求
     */
    void updateStatus(Long id, StatusUpdateReq req);

    /**
     * 删除热词
     *
     * @param id 热词 ID
     */
    void delete(Long id);
}

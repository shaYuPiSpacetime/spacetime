package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ContentArticlePageReq;
import com.spacetime.admin.dto.request.ContentArticleSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.ContentArticleVO;

/**
 * 内容文章管理服务接口
 */
public interface ContentArticleAdminService {
    /**
     * 分页查询文章列表
     *
     * @param req 分页查询条件
     * @return 分页结果
     */
    Page<ContentArticleVO> list(ContentArticlePageReq req);

    /**
     * 查询文章详情
     *
     * @param id 文章 ID
     * @return 文章详情
     */
    ContentArticleVO detail(Long id);

    /**
     * 创建文章
     *
     * @param req 创建请求
     * @return 新文章 ID
     */
    Long create(ContentArticleSaveReq req);

    /**
     * 更新文章
     *
     * @param id  文章 ID
     * @param req 更新请求
     */
    void update(Long id, ContentArticleSaveReq req);

    /**
     * 更新文章状态
     *
     * @param id  文章 ID
     * @param req 状态变更请求
     */
    void updateStatus(Long id, StatusUpdateReq req);

    /**
     * 删除文章
     *
     * @param id 文章 ID
     */
    void delete(Long id);
}

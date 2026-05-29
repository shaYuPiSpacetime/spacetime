package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.miniapp.dto.response.MiniappArticleDetailVO;
import com.spacetime.miniapp.dto.response.MiniappArticleVO;

import java.util.List;
import java.util.Map;

/**
 * 小程序内容服务接口
 */
public interface MiniappContentService {

    /**
     * 分页查询公告列表
     *
     * @param page 页码
     * @param size 每页条数
     * @return 公告分页数据
     */
    Page<MiniappArticleVO> getAnnouncements(int page, int size);

    /**
     * 分页查询帮助文档列表
     *
     * @param category 子分类
     * @param page     页码
     * @param size     每页条数
     * @return 帮助文档分页数据
     */
    Page<MiniappArticleVO> getHelpDocs(String category, int page, int size);

    /**
     * 查询规则类文章列表
     *
     * @param type 文章类型（RULE/SAFETY_GUIDE/FRAUD_GUIDE 等）
     * @return 规则文章列表
     */
    List<MiniappArticleVO> getRules(String type);

    /**
     * 查询文章详情
     *
     * @param id 文章 ID
     * @return 文章详情（含正文）
     */
    MiniappArticleDetailVO getArticleDetail(Long id);

    /**
     * 查询公开配置项
     *
     * @param keys 配置键列表
     * @return 配置键值对
     */
    Map<String, String> getPublicConfigs(List<String> keys);
}

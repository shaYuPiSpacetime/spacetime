package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.ContentArticle;

import java.util.List;

/**
 * 内容文章数据访问接口
 */
public interface ContentArticleDao {
    /** 分页查询 */
    Page<ContentArticle> selectPage(Page<ContentArticle> page, LambdaQueryWrapper<ContentArticle> wrapper);
    /** 按 ID 查询 */
    ContentArticle selectById(Long id);
    /** 查询已启用且已生效的文章（小程序用） */
    Page<ContentArticle> selectEnabledPage(Page<ContentArticle> page, String type, String category);
    /** 新增 */
    void insert(ContentArticle entity);
    /** 更新 */
    void updateById(ContentArticle entity);
    /** 删除 */
    void deleteById(Long id);
}

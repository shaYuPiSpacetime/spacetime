package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.SearchBlockWord;

import java.util.List;

/**
 * 搜索屏蔽词数据访问接口
 */
public interface SearchBlockWordDao {
    /** 分页查询 */
    Page<SearchBlockWord> selectPage(Page<SearchBlockWord> page, LambdaQueryWrapper<SearchBlockWord> wrapper);
    /** 按 ID 查询 */
    SearchBlockWord selectById(Long id);
    /** 查询全部已启用屏蔽词 */
    List<SearchBlockWord> selectEnabledList();
    /** 按词条和匹配方式查询，不区分启停状态。 */
    SearchBlockWord selectByWordAndMatchType(String word, String matchType);
    /** 新增 */
    void insert(SearchBlockWord entity);
    /** 更新 */
    void updateById(SearchBlockWord entity);
    /** 删除 */
    void deleteById(Long id);
}

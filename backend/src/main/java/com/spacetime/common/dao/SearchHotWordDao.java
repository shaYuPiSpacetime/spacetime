package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.SearchHotWord;

import java.util.List;

/**
 * 搜索热词数据访问接口
 */
public interface SearchHotWordDao {
    /** 分页查询 */
    Page<SearchHotWord> selectPage(Page<SearchHotWord> page, LambdaQueryWrapper<SearchHotWord> wrapper);
    /** 按 ID 查询 */
    SearchHotWord selectById(Long id);
    /** 查询已启用热词列表（小程序用） */
    List<SearchHotWord> selectEnabledList(int limit);
    /** 按 scene + word 查询启用的 */
    SearchHotWord selectBySceneAndWord(String scene, String word);
    /** 新增 */
    void insert(SearchHotWord entity);
    /** 更新 */
    void updateById(SearchHotWord entity);
    /** 删除 */
    void deleteById(Long id);
}

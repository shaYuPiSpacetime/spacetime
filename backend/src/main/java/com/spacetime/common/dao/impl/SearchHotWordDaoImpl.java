package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.SearchHotWordDao;
import com.spacetime.common.entity.SearchHotWord;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.SearchHotWordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 搜索热词数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class SearchHotWordDaoImpl implements SearchHotWordDao {

    private final SearchHotWordMapper searchHotWordMapper;

    @Override
    public Page<SearchHotWord> selectPage(Page<SearchHotWord> page, LambdaQueryWrapper<SearchHotWord> wrapper) {
        return searchHotWordMapper.selectPage(page, wrapper);
    }

    @Override
    public SearchHotWord selectById(Long id) {
        return searchHotWordMapper.selectById(id);
    }

    @Override
    public List<SearchHotWord> selectEnabledList(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        Page<SearchHotWord> page = new Page<>(1, safeLimit);
        Page<SearchHotWord> result = searchHotWordMapper.selectPage(page,
                new LambdaQueryWrapper<SearchHotWord>()
                        .eq(SearchHotWord::getStatus, CommonStatusEnum.ENABLED.getCode())
                        .orderByAsc(SearchHotWord::getSort));
        return result.getRecords();
    }

    @Override
    public SearchHotWord selectBySceneAndWord(String scene, String word) {
        return searchHotWordMapper.selectOne(
                new LambdaQueryWrapper<SearchHotWord>()
                        .eq(SearchHotWord::getScene, scene)
                        .eq(SearchHotWord::getWord, word)
                        .eq(SearchHotWord::getStatus, CommonStatusEnum.ENABLED.getCode()));
    }

    @Override
    public void insert(SearchHotWord entity) {
        searchHotWordMapper.insert(entity);
    }

    @Override
    public void updateById(SearchHotWord entity) {
        searchHotWordMapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        searchHotWordMapper.deleteById(id);
    }
}

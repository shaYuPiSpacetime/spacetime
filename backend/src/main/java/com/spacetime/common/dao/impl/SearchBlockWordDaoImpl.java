package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.SearchBlockWordDao;
import com.spacetime.common.entity.SearchBlockWord;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.SearchBlockWordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 搜索屏蔽词数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class SearchBlockWordDaoImpl implements SearchBlockWordDao {

    private final SearchBlockWordMapper searchBlockWordMapper;

    @Override
    public Page<SearchBlockWord> selectPage(Page<SearchBlockWord> page, LambdaQueryWrapper<SearchBlockWord> wrapper) {
        return searchBlockWordMapper.selectPage(page, wrapper);
    }

    @Override
    public SearchBlockWord selectById(Long id) {
        return searchBlockWordMapper.selectById(id);
    }

    @Override
    public List<SearchBlockWord> selectEnabledList() {
        return searchBlockWordMapper.selectList(
                new LambdaQueryWrapper<SearchBlockWord>()
                        .eq(SearchBlockWord::getStatus, CommonStatusEnum.ENABLED.getCode()));
    }

    @Override
    public SearchBlockWord selectByTypeAndWord(String blockType, String word) {
        return searchBlockWordMapper.selectOne(
                new LambdaQueryWrapper<SearchBlockWord>()
                        .eq(SearchBlockWord::getBlockType, blockType)
                        .eq(SearchBlockWord::getWord, word)
                        .eq(SearchBlockWord::getStatus, CommonStatusEnum.ENABLED.getCode()));
    }

    @Override
    public void insert(SearchBlockWord entity) {
        searchBlockWordMapper.insert(entity);
    }

    @Override
    public void updateById(SearchBlockWord entity) {
        searchBlockWordMapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        searchBlockWordMapper.deleteById(id);
    }
}

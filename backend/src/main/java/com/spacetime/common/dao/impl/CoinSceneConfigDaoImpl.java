package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.mapper.CoinSceneConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 千寻币消费场景配置数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class CoinSceneConfigDaoImpl implements CoinSceneConfigDao {
    /** 千寻币消费场景配置 Mapper */
    private final CoinSceneConfigMapper mapper;

    @Override
    public CoinSceneConfig selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<CoinSceneConfig> selectPage(Page<CoinSceneConfig> page, LambdaQueryWrapper<CoinSceneConfig> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(CoinSceneConfig entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(CoinSceneConfig entity) {
        mapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}

package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.CoinSceneConfig;

/**
 * 千寻币消费场景配置数据访问接口
 */
public interface CoinSceneConfigDao {
    CoinSceneConfig selectById(Long id);
    Page<CoinSceneConfig> selectPage(Page<CoinSceneConfig> page, LambdaQueryWrapper<CoinSceneConfig> wrapper);
    void insert(CoinSceneConfig entity);
    void updateById(CoinSceneConfig entity);
    void deleteById(Long id);
}

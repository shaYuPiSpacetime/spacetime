package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.AppConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 应用配置数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class AppConfigDaoImpl implements AppConfigDao {

    private final AppConfigMapper appConfigMapper;

    @Override
    public List<AppConfig> selectByGroup(String group) {
        return appConfigMapper.selectList(
                new LambdaQueryWrapper<AppConfig>()
                        .eq(AppConfig::getConfigGroup, group)
                        .orderByAsc(AppConfig::getId));
    }

    @Override
    public AppConfig selectByKey(String configKey) {
        return appConfigMapper.selectOne(
                new LambdaQueryWrapper<AppConfig>()
                        .eq(AppConfig::getConfigKey, configKey));
    }

    @Override
    public List<AppConfig> selectByKeys(List<String> keys) {
        if (keys == null || keys.isEmpty()) {
            return List.of();
        }
        return appConfigMapper.selectList(
                new LambdaQueryWrapper<AppConfig>()
                        .in(AppConfig::getConfigKey, keys));
    }

    @Override
    public List<AppConfig> selectPublicEnabled(List<String> keys) {
        if (keys == null || keys.isEmpty()) {
            return List.of();
        }
        return appConfigMapper.selectList(
                new LambdaQueryWrapper<AppConfig>()
                        .in(AppConfig::getConfigKey, keys)
                        .eq(AppConfig::getPublicVisible, 1)
                        .eq(AppConfig::getStatus, CommonStatusEnum.ENABLED.getCode()));
    }

    @Override
    public void upsert(AppConfig entity) {
        AppConfig existing = selectByKey(entity.getConfigKey());
        if (existing != null) {
            entity.setId(existing.getId());
            appConfigMapper.updateById(entity);
        } else {
            appConfigMapper.insert(entity);
        }
    }
}

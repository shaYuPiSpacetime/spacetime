package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppMessageRuleVersionDao;
import com.spacetime.common.entity.AppMessageRuleVersion;
import com.spacetime.common.mapper.AppMessageRuleVersionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 消息规则版本数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageRuleVersionDaoImpl implements AppMessageRuleVersionDao {
    private final AppMessageRuleVersionMapper mapper;

    @Override
    public AppMessageRuleVersion selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppMessageRuleVersion selectCurrent(String scopeCode) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageRuleVersion>()
                .eq(AppMessageRuleVersion::getScopeCode, scopeCode)
                .eq(AppMessageRuleVersion::getActiveMarker, 1));
    }

    @Override
    public AppMessageRuleVersion selectByVersionNo(String versionNo) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageRuleVersion>()
                .eq(AppMessageRuleVersion::getVersionNo, versionNo));
    }

    @Override
    public Page<AppMessageRuleVersion> selectPage(Page<AppMessageRuleVersion> page,
                                                   LambdaQueryWrapper<AppMessageRuleVersion> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(AppMessageRuleVersion entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(AppMessageRuleVersion entity) {
        return mapper.updateById(entity);
    }

    @Override
    public int retireCurrent(Long id) {
        return mapper.retireCurrent(id);
    }
}

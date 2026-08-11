package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppMessageRuleVersion;

/** 消息规则版本数据访问接口。 */
public interface AppMessageRuleVersionDao {
    AppMessageRuleVersion selectById(Long id);
    AppMessageRuleVersion selectCurrent(String scopeCode);
    AppMessageRuleVersion selectByVersionNo(String versionNo);
    Page<AppMessageRuleVersion> selectPage(Page<AppMessageRuleVersion> page,
                                           LambdaQueryWrapper<AppMessageRuleVersion> wrapper);
    void insert(AppMessageRuleVersion entity);
    int updateById(AppMessageRuleVersion entity);
}

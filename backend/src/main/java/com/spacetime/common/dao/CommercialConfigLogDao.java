package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.CommercialConfigLog;

import java.util.List;

/**
 * 商业化配置变更审计数据访问接口
 */
public interface CommercialConfigLogDao {
    CommercialConfigLog selectById(Long id);
    List<CommercialConfigLog> selectLatestSummaries(int limit);
    Page<CommercialConfigLog> selectPage(Page<CommercialConfigLog> page, LambdaQueryWrapper<CommercialConfigLog> wrapper);
    void insert(CommercialConfigLog entity);
}

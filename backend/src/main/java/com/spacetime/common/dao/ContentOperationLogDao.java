package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.ContentOperationLog;

/**
 * 操作日志数据访问接口
 */
public interface ContentOperationLogDao {
    /** 分页查询 */
    Page<ContentOperationLog> selectPage(Page<ContentOperationLog> page, LambdaQueryWrapper<ContentOperationLog> wrapper);
    /** 新增 */
    void insert(ContentOperationLog entity);
}

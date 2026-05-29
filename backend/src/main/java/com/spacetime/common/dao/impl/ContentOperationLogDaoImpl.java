package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.mapper.ContentOperationLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 操作日志数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class ContentOperationLogDaoImpl implements ContentOperationLogDao {

    private final ContentOperationLogMapper contentOperationLogMapper;

    @Override
    public Page<ContentOperationLog> selectPage(Page<ContentOperationLog> page, LambdaQueryWrapper<ContentOperationLog> wrapper) {
        return contentOperationLogMapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(ContentOperationLog entity) {
        contentOperationLogMapper.insert(entity);
    }
}

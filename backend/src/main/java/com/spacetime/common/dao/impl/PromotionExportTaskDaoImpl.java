package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.PromotionExportTaskDao;
import com.spacetime.common.entity.PromotionExportTask;
import com.spacetime.common.mapper.PromotionExportTaskMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 推广导出任务数据访问实现。
 */
@Repository
@RequiredArgsConstructor
public class PromotionExportTaskDaoImpl implements PromotionExportTaskDao {
    private final PromotionExportTaskMapper mapper;

    @Override
    public void insert(PromotionExportTask entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(PromotionExportTask entity) {
        return mapper.updateById(entity);
    }

    @Override
    public PromotionExportTask selectByTaskNo(String taskNo) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionExportTask>()
                .eq(PromotionExportTask::getTaskNo, taskNo));
    }
}

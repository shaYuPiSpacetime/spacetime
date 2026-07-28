package com.spacetime.common.dao;

import com.spacetime.common.entity.PromotionExportTask;

/**
 * 推广导出任务数据访问接口。
 */
public interface PromotionExportTaskDao {
    void insert(PromotionExportTask entity);
    int updateById(PromotionExportTask entity);
    PromotionExportTask selectByTaskNo(String taskNo);
}

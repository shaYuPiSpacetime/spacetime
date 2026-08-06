package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.RecommendViewLog;

import java.util.List;

/** 推荐浏览事件数据访问接口。 */
public interface RecommendViewLogDao {
    RecommendViewLog selectByRequestAction(Long userId, String requestId, String action);
    List<RecommendViewLog> selectList(LambdaQueryWrapper<RecommendViewLog> wrapper);
    Page<RecommendViewLog> selectPage(Page<RecommendViewLog> page,
                                      LambdaQueryWrapper<RecommendViewLog> wrapper);
    void insert(RecommendViewLog entity);
}

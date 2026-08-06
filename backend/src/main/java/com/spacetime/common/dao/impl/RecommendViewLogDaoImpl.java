package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.RecommendViewLogDao;
import com.spacetime.common.entity.RecommendViewLog;
import com.spacetime.common.mapper.RecommendViewLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/** 推荐浏览事件数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class RecommendViewLogDaoImpl implements RecommendViewLogDao {
    private final RecommendViewLogMapper mapper;

    @Override
    public RecommendViewLog selectByRequestAction(Long userId, String requestId, String action) {
        return mapper.selectOne(new LambdaQueryWrapper<RecommendViewLog>()
                .eq(RecommendViewLog::getUserId, userId)
                .eq(RecommendViewLog::getRequestId, requestId)
                .eq(RecommendViewLog::getAction, action)
                .last("LIMIT 1"));
    }

    @Override
    public List<RecommendViewLog> selectList(LambdaQueryWrapper<RecommendViewLog> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public Page<RecommendViewLog> selectPage(Page<RecommendViewLog> page,
                                             LambdaQueryWrapper<RecommendViewLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(RecommendViewLog entity) {
        mapper.insert(entity);
    }
}

package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.RecommendPreferenceDao;
import com.spacetime.common.entity.RecommendPreference;
import com.spacetime.common.mapper.RecommendPreferenceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 推荐筛选偏好数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class RecommendPreferenceDaoImpl implements RecommendPreferenceDao {
    private final RecommendPreferenceMapper mapper;

    @Override
    public RecommendPreference selectByUserId(Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<RecommendPreference>()
                .eq(RecommendPreference::getUserId, userId)
                .last("LIMIT 1"));
    }

    @Override
    public void insert(RecommendPreference entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(RecommendPreference entity) {
        mapper.updateById(entity);
    }

    @Override
    public int updateByVersion(RecommendPreference entity, Integer expectedVersion) {
        return mapper.update(entity, new LambdaUpdateWrapper<RecommendPreference>()
                .eq(RecommendPreference::getUserId, entity.getUserId())
                .eq(RecommendPreference::getVersion, expectedVersion));
    }
}

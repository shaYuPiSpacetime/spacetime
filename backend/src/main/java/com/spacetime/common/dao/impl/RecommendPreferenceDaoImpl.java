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
                // MyBatis 默认忽略实体的空字段，必须显式写入用户清空的范围。
                .set(entity.getMinHeight() == null, RecommendPreference::getMinHeight, null)
                .set(entity.getMaxHeight() == null, RecommendPreference::getMaxHeight, null)
                .set(entity.getMinWeight() == null, RecommendPreference::getMinWeight, null)
                .set(entity.getMaxWeight() == null, RecommendPreference::getMaxWeight, null)
                .eq(RecommendPreference::getUserId, entity.getUserId())
                .eq(RecommendPreference::getVersion, expectedVersion));
    }
}

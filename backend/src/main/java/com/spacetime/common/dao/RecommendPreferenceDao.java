package com.spacetime.common.dao;

import com.spacetime.common.entity.RecommendPreference;

/** 推荐筛选偏好数据访问接口。 */
public interface RecommendPreferenceDao {
    RecommendPreference selectByUserId(Long userId);
    void insert(RecommendPreference entity);
    void updateById(RecommendPreference entity);
    int updateByVersion(RecommendPreference entity, Integer expectedVersion);
}

package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.RecommendPreference;
import org.apache.ibatis.annotations.Mapper;

/** 推荐筛选偏好 Mapper。 */
@Mapper
public interface RecommendPreferenceMapper extends BaseMapper<RecommendPreference> {
}

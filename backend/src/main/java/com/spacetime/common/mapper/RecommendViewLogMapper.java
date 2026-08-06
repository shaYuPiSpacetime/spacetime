package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.RecommendViewLog;
import org.apache.ibatis.annotations.Mapper;

/** 推荐浏览事件 Mapper。 */
@Mapper
public interface RecommendViewLogMapper extends BaseMapper<RecommendViewLog> {
}

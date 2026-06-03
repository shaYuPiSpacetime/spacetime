package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityLike;
import org.apache.ibatis.annotations.Mapper;

/**
 * 社区点赞Mapper
 */
@Mapper
public interface CommunityLikeMapper extends BaseMapper<CommunityLike> {
}

package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityFollow;
import org.apache.ibatis.annotations.Mapper;

/**
 * 社区关注Mapper
 */
@Mapper
public interface CommunityFollowMapper extends BaseMapper<CommunityFollow> {
}

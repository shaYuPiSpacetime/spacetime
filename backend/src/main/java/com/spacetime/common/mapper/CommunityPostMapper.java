package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityPost;
import org.apache.ibatis.annotations.Mapper;

/**
 * 社区内容Mapper
 */
@Mapper
public interface CommunityPostMapper extends BaseMapper<CommunityPost> {
}

package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityComment;
import org.apache.ibatis.annotations.Mapper;

/**
 * 社区评论Mapper
 */
@Mapper
public interface CommunityCommentMapper extends BaseMapper<CommunityComment> {
}

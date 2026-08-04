package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityEventOutbox;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CommunityEventOutboxMapper extends BaseMapper<CommunityEventOutbox> {}

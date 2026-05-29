package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.SearchBlockWord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 搜索屏蔽词 Mapper
 */
@Mapper
public interface SearchBlockWordMapper extends BaseMapper<SearchBlockWord> {
}

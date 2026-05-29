package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.SearchHotWord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 搜索热词 Mapper
 */
@Mapper
public interface SearchHotWordMapper extends BaseMapper<SearchHotWord> {
}

package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.ContentArticle;
import org.apache.ibatis.annotations.Mapper;

/**
 * 公共内容文章 Mapper
 */
@Mapper
public interface ContentArticleMapper extends BaseMapper<ContentArticle> {
}

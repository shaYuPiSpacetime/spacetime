package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppRelationMatchSource;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 匹配来源明细 MyBatis Mapper。 */
@Mapper
public interface AppRelationMatchSourceMapper extends BaseMapper<AppRelationMatchSource> {
    /** 按主键锁定匹配来源。 */
    @Select("SELECT * FROM app_relation_match_source WHERE id=#{sourceId} AND deleted=0 FOR UPDATE")
    AppRelationMatchSource selectByIdForUpdate(@Param("sourceId") Long sourceId);
}

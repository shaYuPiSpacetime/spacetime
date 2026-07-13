package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.SysDictData;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 字典数据 Mapper
 */
@Mapper
public interface SysDictDataMapper extends BaseMapper<SysDictData> {

    /** 查询直接子级，并在同一条 SQL 中判断节点是否还有下一级。 */
    @Select("""
            <script>
            SELECT d.*,
                   CASE WHEN EXISTS (
                       SELECT 1
                       FROM sys_dict_data child
                       WHERE child.dict_type = d.dict_type
                         AND child.parent_id = d.id
                         AND child.deleted = 0
                         <if test="enabledOnly">
                         AND child.status = 'ENABLED'
                         </if>
                   ) THEN TRUE ELSE FALSE END AS has_children
            FROM sys_dict_data d
            WHERE d.dict_type = #{dictType}
              AND d.parent_id = #{parentId}
              AND d.deleted = 0
              <if test="enabledOnly">
              AND d.status = 'ENABLED'
              </if>
            ORDER BY d.dict_sort ASC, d.id ASC
            </script>
            """)
    List<SysDictData> selectChildren(@Param("dictType") String dictType,
                                     @Param("parentId") Long parentId,
                                     @Param("enabledOnly") boolean enabledOnly);
}

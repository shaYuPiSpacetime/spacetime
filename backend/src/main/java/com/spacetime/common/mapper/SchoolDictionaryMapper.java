package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.SchoolDictionary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SchoolDictionaryMapper extends BaseMapper<SchoolDictionary> {

    /** 参数全部使用 MyBatis 绑定，关键词不参与 SQL 拼接。 */
    @Select("""
            SELECT *
            FROM school_dictionary
            WHERE deleted = 0
              AND status = 'ENABLED'
              AND (school_name LIKE CONCAT('%', #{keyword}, '%')
                   OR short_name LIKE CONCAT('%', #{keyword}, '%')
                   OR old_name LIKE CONCAT('%', #{keyword}, '%'))
            ORDER BY CASE
                       WHEN school_name = #{keyword} THEN 0
                       WHEN short_name = #{keyword} THEN 1
                       WHEN school_name LIKE CONCAT(#{keyword}, '%') THEN 2
                       WHEN short_name LIKE CONCAT(#{keyword}, '%') THEN 3
                       ELSE 4
                     END,
                     is_985 DESC, is_211 DESC, is_dual_class DESC,
                     school_name ASC, id ASC
            LIMIT #{limit}
            """)
    List<SchoolDictionary> search(@Param("keyword") String keyword, @Param("limit") int limit);
}

package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionRuleCurrent;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 推广当前规则指针 Mapper。
 */
@Mapper
public interface PromotionRuleCurrentMapper extends BaseMapper<PromotionRuleCurrent> {

    @Select("SELECT * FROM promotion_rule_current WHERE source_type = #{sourceType} AND deleted = 0 LIMIT 1 FOR UPDATE")
    PromotionRuleCurrent selectBySourceTypeForUpdate(@Param("sourceType") String sourceType);
}

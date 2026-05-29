package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 搜索屏蔽词实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("search_block_word")
public class SearchBlockWord extends BaseEntity {
    /** 屏蔽词内容 */
    private String word;
    /** 屏蔽类型 @see com.spacetime.common.enums.SearchBlockTypeEnum */
    private String blockType;
    /** 匹配类型 @see com.spacetime.common.enums.MatchTypeEnum */
    private String matchType;
    /** 屏蔽原因字典值 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String reasonCode;
    /** 命中提示文案 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String hitMessage;
    /** 状态 @see com.spacetime.common.enums.CommonStatusEnum */
    private String status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}

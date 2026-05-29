package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 搜索热词实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("search_hot_word")
public class SearchHotWord extends BaseEntity {
    /** 热词内容 */
    private String word;
    /** 适用场景 */
    private String scene;
    /** 排序号 */
    private Integer sort;
    /** 状态 @see com.spacetime.common.enums.CommonStatusEnum */
    private String status;
}

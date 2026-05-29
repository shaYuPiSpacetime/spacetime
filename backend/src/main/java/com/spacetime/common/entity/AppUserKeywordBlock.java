package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户个人关键词屏蔽实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_keyword_block")
public class AppUserKeywordBlock extends BaseEntity {
    /** 用户ID */
    private Long userId;
    /** 屏蔽关键词 */
    private String keyword;
    /** 状态 @see com.spacetime.common.enums.CommonStatusEnum */
    private String status;
}

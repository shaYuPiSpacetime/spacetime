package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户屏蔽关系实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_relation_block")
public class AppUserRelationBlock extends BaseEntity {
    /** 发起用户ID */
    private Long userId;
    /** 目标用户ID */
    private Long targetUserId;
    /** 屏蔽类型 @see com.spacetime.common.enums.RelationBlockTypeEnum */
    private String blockType;
    /** 来源场景 */
    private String sourceScene;
    /** 状态 @see com.spacetime.common.enums.CommonStatusEnum */
    private String status;
}

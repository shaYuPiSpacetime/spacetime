package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 邀请对象成功人数计数器。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_invite_counter")
public class PromotionInviteCounter extends BaseEntity {
    /** 来源类型 */
    private String sourceType;
    /** 普通邀请人或代理主键 */
    private Long rewardObjectId;
    /** 成功邀请人数 */
    private Integer successCount;
}

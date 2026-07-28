package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 推广规则不可变版本头。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_rule")
public class PromotionRule extends BaseEntity {
    /** 来源类型 */
    private String sourceType;
    /** 奖励模式：fixed/ladder */
    private String rewardMode;
    /** 来源内递增版本号 */
    private Integer versionNo;
    /** 版本状态：published/superseded */
    private String status;
    /** 发布时间 */
    private LocalDateTime publishedAt;
    /** 发布人 */
    private Long publishedBy;
}

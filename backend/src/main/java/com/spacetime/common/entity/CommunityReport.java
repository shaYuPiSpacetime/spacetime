package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 社区举报单
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_report")
public class CommunityReport extends BaseEntity {
    /** 举报人ID */
    private Long reporterId;
    /** 举报目标类型 @see CommunityReportTargetTypeEnum */
    private String targetType;
    /** 被举报目标ID */
    private Long targetId;
    /** 举报原因编码 */
    private String reasonCode;
    /** 补充说明 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String extraText;
    /** 处理状态 @see CommunityReportStatusEnum */
    private String status;
    /** 处理动作 @see CommunityReportHandleActionEnum */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String handleAction;
    /** 处理备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String handleRemark;
    /** 处理人ID */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Long handlerId;
}

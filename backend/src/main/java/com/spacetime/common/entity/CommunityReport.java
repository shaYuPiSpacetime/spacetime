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
    /** 举报业务编号 */
    private String reportNo;
    /** 举报人ID */
    private Long reporterId;
    /** 举报目标类型 @see CommunityReportTargetTypeEnum */
    private String targetType;
    /** 聊天来源类型 */
    private String sourceType;
    /** 被举报目标ID */
    private String targetId;
    /** 服务端反查的被举报用户 */
    private Long targetUserId;
    /** 举报原因编码 */
    private String reasonCode;
    /** 补充说明 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String extraText;
    private String contextJson;
    private String evidenceJson;
    /** 处理状态 @see CommunityReportStatusEnum */
    private String status;
    /** 举报人回复状态：pending/sent/failed。 */
    private String replyStatus;
    private Integer version;
    private Long mergedToReportId;
    /** 处理动作 @see CommunityReportHandleActionEnum */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String handleAction;
    private String punishmentAction;
    private java.time.LocalDateTime punishmentUntil;
    private String targetIp;
    /** 处理说明 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String handleRemark;
    /** 处理人ID */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Long handlerId;
    private java.time.LocalDateTime handlerTime;
    private Integer activeMarker;
}

package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 后台举报视图
 */
@Data
public class CommunityReportAdminVO {
    /** 主键ID */
    private Long id;
    /** 举报人ID */
    private Long reporterId;
    /** 举报人昵称 */
    private String reporterName;
    /** 举报人手机号 */
    private String reporterPhone;
    /** 举报目标类型 @see CommunityReportTargetTypeEnum */
    private String targetType;
    /** 举报目标ID */
    private Long targetId;
    /** 举报原因编码 */
    private String reasonCode;
    /** 举报原因标签 */
    private String reasonLabel;
    /** 补充说明 */
    private String extraText;
    /** 处理状态 @see CommunityReportStatusEnum */
    private String status;
    /** 处理动作 @see CommunityReportHandleActionEnum */
    private String handleAction;
    /** 处理备注 */
    private String handleRemark;
    /** 处理人ID */
    private Long handlerId;
    /** 处理人名称 */
    private String handlerName;
    /** 创建时间 */
    private String createTime;
    /** 更新时间 */
    private String updateTime;
}

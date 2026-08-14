package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 后台举报视图
 */
@Data
public class CommunityReportAdminVO {
    /** 主键ID */
    private Long id;
    private String reportNo;
    /** 举报人ID */
    private Long reporterId;
    private String reporterNo;
    /** 举报人昵称 */
    private String reporterName;
    /** 举报人手机号 */
    private String reporterPhone;
    /** 举报目标类型 @see CommunityReportTargetTypeEnum */
    private String targetType;
    /** 举报目标ID */
    private String targetId;
    private Long targetUserId;
    private String targetUserNo;
    private String targetUserName;
    private String targetNo;
    /** 举报原因编码 */
    private String reasonCode;
    /** 举报原因标签 */
    private String reasonLabel;
    /** 补充说明 */
    private String extraText;
    /** 举报人上传的凭证图片URL，最多3张；后台详情可见。 */
    private List<String> evidenceImageUrls;
    /** 处理状态 @see CommunityReportStatusEnum */
    private String status;
    private String statusName;
    private String replyStatus;
    /** 处理动作 @see CommunityReportHandleActionEnum */
    private String handleAction;
    private String punishAction;
    /** 处理备注 */
    private String handleRemark;
    /** 处理人ID */
    private Long handlerId;
    /** 处理人名称 */
    private String handlerName;
    private String mergedIntoReportNo;
    private String riskIpMasked;
    private Integer version;
    private String handleTime;
    private CommunityReportContextVO context;
    private List<CommunityAuditLogVO> auditLogs;
    /** 创建时间 */
    private String createTime;
    /** 更新时间 */
    private String updateTime;
}

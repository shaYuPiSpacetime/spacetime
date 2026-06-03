package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 后台举报分页查询
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CommunityReportPageReq extends PageReq {
    /** 举报人ID */
    private Long reporterId;
    /** 举报目标类型 @see CommunityReportTargetTypeEnum */
    private String targetType;
    /** 举报状态 @see CommunityReportStatusEnum */
    private String status;
    /** 举报原因编码 */
    private String reasonCode;
}

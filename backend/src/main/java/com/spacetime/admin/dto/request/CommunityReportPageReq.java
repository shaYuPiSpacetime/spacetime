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
    private Long reporterId;
    private String targetType;
    private String status;
    private String reasonCode;
}

package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 内容操作日志分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ContentOperationLogPageReq extends PageReq {
    /** 业务类型 */
    private String bizType;
    /** 动作 */
    private String action;
}

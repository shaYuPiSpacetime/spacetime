package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 公告与协议预置内容分页查询请求。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ComplianceContentPageReq extends PageReq {
    /** 内容分组类型，例如 RULE、ANNOUNCEMENT、HELP_DOC。 */
    private String type;
    /** 标题模糊搜索。 */
    private String title;
    /** 启停状态。 */
    private String status;
}

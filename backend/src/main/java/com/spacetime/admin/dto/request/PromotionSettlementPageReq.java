package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 代理结算分页请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PromotionSettlementPageReq extends PageReq {
    /** 代理ID */
    private Long agentId;
    /** 代理名称/联系人/手机号 */
    private String agentKeyword;
    /** 状态 */
    private String status;
}

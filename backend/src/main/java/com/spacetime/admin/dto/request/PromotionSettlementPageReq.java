package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 代理结算分页请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PromotionSettlementPageReq extends PageReq {
    /** 结算单号 */
    private String settlementNo;
    /** 代理ID */
    private Long agentId;
    /** 代理名称/联系人/手机号 */
    private String agentKeyword;
    /** 状态 */
    private String status;
    /** 周期开始 */
    private LocalDate periodStart;
    /** 周期结束 */
    private LocalDate periodEnd;
}

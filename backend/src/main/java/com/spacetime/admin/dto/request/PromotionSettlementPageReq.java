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
    /** 代理编号、名称、学校或校区 */
    private String agentKeyword;
    /** 状态 */
    private String status;
    /** 结算月份，yyyy-MM */
    private String periodMonth;
}

package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 退款详情响应
 */
@Data
public class RefundDetailVO {
    /** 退款记录 */
    private RefundRecordVO refund;
    /** 订单详情 */
    private TradeOrderDetailVO order;
    /** 资产回退说明 */
    private String assetRollbackDesc;
}

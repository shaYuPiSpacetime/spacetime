package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 商业化通用参数响应。
 */
@Data
public class CommercialSettingsVO {
    private Integer idealBatchMax;
    private Integer idealBatchDiscountPercent;
    private Integer idealRetentionDays;
    private Integer normalViewQuota;
    private Integer vipViewQuota;
    private Integer vipExpireRemindDays;
    private Boolean refundDisplay;
    private Boolean exposureReserveEnabled;
    private String exposureReserveDescription;
}

package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 理想型结果页必要的动态价格摘要。 */
@Data
public class IdealPricingVO {
    private Integer unitPrice;
    private Integer discountPercent;
    private Integer retentionDays;
    private Integer batchMax;
}

package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 理想型结果页必要的动态价格摘要。 */
@Data
public class IdealPricingVO {
    private Integer unitPrice;
    private Integer discountPercent;
    private Integer retentionDays;
    /** 兼容旧客户端字段；0 表示不限解锁人数。 */
    private Integer batchMax;
}

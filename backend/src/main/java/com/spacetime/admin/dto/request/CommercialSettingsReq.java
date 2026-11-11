package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 商业化通用参数保存请求。
 */
@Data
public class CommercialSettingsReq {
    /** 资料认证一次性本人奖励；零关闭，旧客户端省略时保留原值。 */
    @jakarta.validation.constraints.DecimalMin("0")
    @jakarta.validation.constraints.DecimalMax("2147483647")
    @jakarta.validation.constraints.Digits(integer = 10, fraction = 0)
    private java.math.BigDecimal certificationRewardCoins;
    /** 兼容旧管理端，不再作为解锁限制；0 表示不限人数。 */
    @Min(0)
    private Integer idealBatchMax;
    @NotNull @Min(0) @Max(100)
    private Integer idealBatchDiscountPercent;
    @NotNull @Min(1)
    private Integer idealRetentionDays;
    @NotNull @Min(0)
    private Integer normalViewQuota;
    @NotNull @Min(0)
    private Integer vipViewQuota;
    @NotNull @Min(1) @Max(30)
    private Integer vipExpireRemindDays;
    @NotNull
    private Boolean refundDisplay;
    @NotNull
    private Boolean exposureReserveEnabled;
    private String exposureReserveDescription;
}

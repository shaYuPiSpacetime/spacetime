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
    @NotNull @Min(1)
    private Integer idealBatchMax;
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

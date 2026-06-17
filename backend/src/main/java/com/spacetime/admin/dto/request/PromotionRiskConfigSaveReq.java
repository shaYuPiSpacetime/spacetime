package com.spacetime.admin.dto.request;

import lombok.Data;

/**
 * 推广风控配置保存请求。
 */
@Data
public class PromotionRiskConfigSaveReq {
    private Integer dailyCap;
    private Integer deviceThreshold;
    private Integer phoneThreshold;
    private Integer paymentThreshold;
    private Boolean freezeSwitch;
    private Boolean reviewSwitch;
}

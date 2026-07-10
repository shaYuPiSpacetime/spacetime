package com.spacetime.admin.dto.request;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

/**
 * 商业化配置聚合保存请求
 */
@Data
public class CommercialConfigSaveReq {
    /** VIP 权益配置 */
    @Valid
    private List<VipBenefitSaveReq> vipBenefits;
    /** VIP 套餐配置 */
    @Valid
    private List<VipPackageSaveReq> vipPackages;
    /** 千寻币套餐配置 */
    @Valid
    private List<CoinPackageSaveReq> coinPackages;
    /** 千寻币消费场景配置 */
    @Valid
    private List<CoinSceneConfigReq> coinScenes;
    /** 解锁、社交、订单与曝光预留配置 */
    @Valid
    private CommercialSettingsReq settings;
    /** 变更摘要 */
    private String changeSummary;
}

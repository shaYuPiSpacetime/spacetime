package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 商业化配置聚合响应
 */
@Data
public class CommercialConfigVO {
    /** 配置版本号 */
    private String configVersion;
    /** VIP 权益 */
    private List<VipBenefitVO> vipBenefits;
    /** VIP 套餐 */
    private List<VipPackageVO> vipPackages;
    /** 千寻币套餐 */
    private List<CoinPackageVO> coinPackages;
    /** 千寻币消费场景 */
    private List<CoinSceneConfigVO> coinScenes;
    /** 最近变更日志 */
    private List<CommercialConfigLogVO> latestLogs;
}

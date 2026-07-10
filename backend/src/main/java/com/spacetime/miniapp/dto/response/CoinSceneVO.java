package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 小程序千寻币消费场景响应。
 */
@Data
public class CoinSceneVO {
    /** 场景 ID */
    private Long id;
    /** 场景编码 */
    private String sceneCode;
    /** 移动端展示名称 */
    private String mobileDisplayName;
    /** 移动端图标 */
    private String mobileIcon;
    /** 场景说明 */
    private String sceneDesc;
    /** 单价，单位为千寻币 */
    private Integer unitPrice;
    /** 解锁保留天数，0 表示永久 */
    private Integer retentionDays;
}

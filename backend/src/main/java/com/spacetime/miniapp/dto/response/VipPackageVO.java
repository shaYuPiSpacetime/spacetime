package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;

/**
 * VIP 套餐响应
 */
@Data
public class VipPackageVO {
    /** 套餐 ID */
    private Long id;
    /** 套餐名称 */
    private String packageName;
    /** 套餐类型 */
    private String packageType;
    /** 售价 */
    private BigDecimal price;
    /** 原价 */
    private BigDecimal originPrice;
    /** 有效天数 */
    private Integer durationDays;
    /** 是否推荐 */
    private Integer recommendFlag;
    /** 套餐标签 */
    private String packageTag;
}

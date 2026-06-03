package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 成家币套餐响应
 */
@Data
public class CoinPackageVO {
    /** 套餐 ID */
    private Long id;
    /** 套餐名称 */
    private String packageName;
    /** 售价 */
    private BigDecimal amount;
    /** 基础币数 */
    private Integer coinCount;
    /** 赠送币数 */
    private Integer bonusCoinCount;
    /** 是否推荐 */
    private Integer recommendFlag;
    /** 套餐标签 */
    private String packageTag;
    /** 套餐描述 */
    private String packageDesc;
}

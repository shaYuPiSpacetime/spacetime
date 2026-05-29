package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 成家币套餐配置
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_coin_package")
public class CoinPackage extends BaseEntity {
    /** 套餐名称 */
    private String packageName;
    /** 售价 */
    private BigDecimal amount;
    /** 成家币数量 */
    private Integer coinCount;
    /** 赠送成家币数量 */
    private Integer bonusCoinCount;
    /** 是否推荐: 0=否, 1=是 */
    private Integer recommendFlag;
    /** 套餐标签 */
    private String packageTag;
    /** 套餐描述 */
    private String packageDesc;
    /** 排序号 */
    private Integer sortOrder;
    /** 状态: ENABLED/DISABLED */
    private String status;
}

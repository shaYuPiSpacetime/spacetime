package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * VIP套餐配置
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_vip_package")
public class VipPackage extends BaseEntity {
    /** 套餐名称 */
    private String packageName;
    /** 套餐类型: normal/limited */
    private String packageType;
    /** 售价 */
    private BigDecimal price;
    /** 原价 */
    private BigDecimal originPrice;
    /** 有效天数 */
    private Integer durationDays;
    /** 是否推荐: 0=否, 1=是 */
    private Integer recommendFlag;
    /** 套餐标签 */
    private String packageTag;
    /** 排序号 */
    private Integer sortOrder;
    /** 状态: ENABLED/DISABLED */
    private String status;
}

package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * VIP权益配置
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_vip_benefit")
public class VipBenefit extends BaseEntity {
    /** 权益编码 */
    private String benefitCode;
    /** 权益名称 */
    private String benefitName;
    /** 权益类型 */
    private String benefitType;
    /** 权益描述 */
    private String benefitDesc;
    /** 移动端图标 */
    private String mobileIcon;
    /** 权益数值 */
    private Integer benefitValue;
    /** 是否固定权益: 0=否, 1=是 */
    private Integer fixedFlag;
    /** 展示排序 */
    private Integer displayOrder;
    /** 状态: ENABLED/DISABLED */
    private String status;
}

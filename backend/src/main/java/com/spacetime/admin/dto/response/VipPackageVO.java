package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * VIP 套餐响应
 */
@Data
public class VipPackageVO {
    /** 主键ID */
    private Long id;
    /** 套餐名称 */
    private String packageName;
    /** 套餐类型 */
    private String packageType;
    /** 订阅类型 */
    private String subscriptionType;
    /** 售价（元） */
    private BigDecimal price;
    /** 原价（元） */
    private BigDecimal originPrice;
    /** 有效天数 */
    private Integer durationDays;
    /** 是否推荐（0=否 1=是） */
    private Integer recommendFlag;
    /** 套餐标签 */
    private String packageTag;
    /** 微信商品 ID */
    private String wechatProductId;
    /** 协议配置 */
    private String agreementConfig;
    /** 支付渠道预留字段 */
    private String payChannelReserve;
    /** 排序 */
    private Integer sortOrder;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 创建时间 */
    private LocalDateTime createTime;
    /** 更新时间 */
    private LocalDateTime updateTime;
}

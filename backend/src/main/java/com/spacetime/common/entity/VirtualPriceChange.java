package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** 微信虚拟商品改价任务；生效前不改变套餐当前售价。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_virtual_price_change")
public class VirtualPriceChange extends BaseEntity {
    private String packageType;
    private Long packageId;
    private String oldProductId;
    private String newProductId;
    private BigDecimal targetPrice;
    private String status;
    private LocalDateTime publishedAt;
    private LocalDateTime activeAt;
    private Boolean enableAfterPublish;
    private String lastError;
}

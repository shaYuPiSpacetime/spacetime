package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * VIP 套餐响应
 */
@Data
public class VipPackageVO {
    private Long id;
    private String packageName;
    private String packageType;
    private BigDecimal price;
    private BigDecimal originPrice;
    private Integer durationDays;
    private Integer recommendFlag;
    private String packageTag;
    private Integer sortOrder;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}

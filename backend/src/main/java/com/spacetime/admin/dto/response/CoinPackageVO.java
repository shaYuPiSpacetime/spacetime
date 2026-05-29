package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 成家币套餐响应
 */
@Data
public class CoinPackageVO {
    private Long id;
    private String packageName;
    private BigDecimal amount;
    private Integer coinCount;
    private Integer bonusCoinCount;
    private Integer recommendFlag;
    private String packageTag;
    private String packageDesc;
    private Integer sortOrder;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}

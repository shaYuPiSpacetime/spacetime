package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 成家币套餐响应
 */
@Data
public class CoinPackageVO {
    /** 主键ID */
    private Long id;
    /** 套餐名称 */
    private String packageName;
    /** 售价（元） */
    private BigDecimal amount;
    /** 成家币数量 */
    private Integer coinCount;
    /** 赠送成家币数量 */
    private Integer bonusCoinCount;
    /** 是否推荐（0=否 1=是） */
    private Integer recommendFlag;
    /** 套餐标签 */
    private String packageTag;
    /** 套餐描述 */
    private String packageDesc;
    /** 排序 */
    private Integer sortOrder;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 创建时间 */
    private LocalDateTime createTime;
    /** 更新时间 */
    private LocalDateTime updateTime;
}

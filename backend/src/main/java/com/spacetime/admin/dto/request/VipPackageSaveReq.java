package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * VIP 套餐保存请求
 */
@Data
public class VipPackageSaveReq {
    /** 套餐名称 */
    @NotBlank(message = "套餐名称不能为空")
    private String packageName;
    /** 套餐类型 */
    @NotBlank(message = "套餐类型不能为空")
    private String packageType;
    /** 售价 */
    @NotNull(message = "售价不能为空")
    private BigDecimal price;
    /** 原价 */
    private BigDecimal originPrice;
    /** 有效天数 */
    @NotNull(message = "有效天数不能为空")
    private Integer durationDays;
    /** 是否推荐 */
    private Integer recommendFlag;
    /** 套餐标签 */
    private String packageTag;
    /** 排序 */
    private Integer sortOrder;
    /** 状态 */
    private String status;
}

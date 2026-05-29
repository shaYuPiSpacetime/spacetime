package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 成家币套餐保存请求
 */
@Data
public class CoinPackageSaveReq {
    /** 套餐名称 */
    @NotBlank(message = "套餐名称不能为空")
    private String packageName;
    /** 售价 */
    @NotNull(message = "售价不能为空")
    private BigDecimal amount;
    /** 成家币数量 */
    @NotNull(message = "成家币数量不能为空")
    private Integer coinCount;
    /** 赠送成家币数量 */
    private Integer bonusCoinCount;
    /** 是否推荐 */
    private Integer recommendFlag;
    /** 套餐标签 */
    private String packageTag;
    /** 套餐描述 */
    private String packageDesc;
    /** 排序 */
    private Integer sortOrder;
    /** 状态 */
    private String status;
}

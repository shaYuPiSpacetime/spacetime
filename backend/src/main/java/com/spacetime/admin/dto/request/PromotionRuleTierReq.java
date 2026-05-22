package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 推广阶梯规则请求
 */
@Data
public class PromotionRuleTierReq {
    /** 阶梯最小成功邀请数 */
    @NotNull(message = "阶梯最小人数不能为空")
    private Integer minCount;
    /** 阶梯最大成功邀请数 */
    @NotNull(message = "阶梯最大人数不能为空")
    private Integer maxCount;
    /** 奖励金额 */
    @NotNull(message = "奖励金额不能为空")
    private BigDecimal rewardAmount;
    /** 状态 */
    private String status;
    /** 备注 */
    private String remark;
}

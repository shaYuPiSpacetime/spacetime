package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 创建订单请求
 */
@Data
public class CreateOrderReq {
    /** 订单类型 @see com.spacetime.common.enums.OrderTypeEnum */
    @NotBlank(message = "订单类型不能为空")
    private String orderType;
    /** 套餐 ID */
    @NotNull(message = "套餐ID不能为空")
    private Long packageId;
}

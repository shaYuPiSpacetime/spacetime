package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 退款订单分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class RefundPageReq extends PageReq {
    /** 订单号 */
    private String orderNo;
    /** 用户 ID */
    private Long userId;
    /** 开始时间 */
    private LocalDateTime startTime;
    /** 结束时间 */
    private LocalDateTime endTime;
}

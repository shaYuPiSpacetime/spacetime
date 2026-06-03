package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.CreateOrderReq;
import com.spacetime.miniapp.dto.response.CreateOrderVO;
import com.spacetime.miniapp.dto.response.PayResultVO;
import com.spacetime.miniapp.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序支付控制器
 */
@Slf4j
@RestController
@RequestMapping("/miniapp/payment")
@RequiredArgsConstructor
public class PaymentController {

    /** 支付服务 */
    private final PaymentService paymentService;

    /**
     * 创建支付订单（VIP/成家币套餐购买）
     *
     * @param req 订单请求（订单类型、套餐ID）
     * @return 订单创建结果（订单ID、订单编号）
     */
    @PostMapping("/create-order")
    public R<CreateOrderVO> createOrder(@Valid @RequestBody CreateOrderReq req) {
        Long userId = currentUserId();
        log.info("创建订单: userId={}, orderType={}, packageId={}", userId, req.getOrderType(), req.getPackageId());
        return R.ok(paymentService.createOrder(userId, req));
    }

    /**
     * mock 模拟支付（开发调试用，模拟支付回调）
     *
     * @param orderId 订单ID
     * @return 支付结果（订单编号、状态、资产变更）
     */
    @PostMapping("/mock-pay/{orderId}")
    public R<PayResultVO> mockPay(@PathVariable Long orderId) {
        Long userId = currentUserId();
        log.info("模拟支付: userId={}, orderId={}", userId, orderId);
        return R.ok(paymentService.mockPay(userId, orderId));
    }

    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }
}

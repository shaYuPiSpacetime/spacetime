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
import org.springframework.web.bind.annotation.*;

/**
 * 小程序支付控制器
 */
@RestController
@RequestMapping("/miniapp/payment")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    /** 创建订单 */
    @PostMapping("/create-order")
    public R<CreateOrderVO> createOrder(@Valid @RequestBody CreateOrderReq req) {
        return R.ok(paymentService.createOrder(currentUserId(), req));
    }

    /** mock 支付 */
    @PostMapping("/mock-pay/{orderId}")
    public R<PayResultVO> mockPay(@PathVariable Long orderId) {
        return R.ok(paymentService.mockPay(currentUserId(), orderId));
    }

    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }
}

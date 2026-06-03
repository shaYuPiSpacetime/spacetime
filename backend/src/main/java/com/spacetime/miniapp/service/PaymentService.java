package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.CreateOrderReq;
import com.spacetime.miniapp.dto.response.CreateOrderVO;
import com.spacetime.miniapp.dto.response.PayResultVO;

/**
 * 小程序支付服务接口
 */
public interface PaymentService {
    /** 创建订单 */
    CreateOrderVO createOrder(Long userId, CreateOrderReq req);
    /** mock 支付（模拟支付回调） */
    PayResultVO mockPay(Long userId, Long orderId);
}

package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.CreateOrderReq;
import com.spacetime.miniapp.dto.response.CreateOrderVO;
import com.spacetime.miniapp.dto.response.PayResultVO;

/**
 * 小程序支付服务接口
 */
public interface PaymentService {

    /**
     * 创建支付订单（VIP套餐或成家币套餐购买）
     *
     * @param userId 用户ID
     * @param req    订单请求（订单类型、套餐ID）
     * @return 订单创建结果（订单ID、订单编号）
     */
    CreateOrderVO createOrder(Long userId, CreateOrderReq req);

    /**
     * mock 模拟支付（开发调试用，模拟支付回调）
     *
     * @param userId  用户ID
     * @param orderId 订单ID
     * @return 支付结果（订单编号、状态、资产变更）
     */
    PayResultVO mockPay(Long userId, Long orderId);
}

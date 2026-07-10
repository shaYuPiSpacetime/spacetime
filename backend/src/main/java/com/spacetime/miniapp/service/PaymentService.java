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
     * 查询当前用户的支付订单结果，过期未支付订单在此处关闭。
     *
     * @param userId 用户ID
     * @param orderId 订单ID
     * @return 订单结果和资产摘要
     */
    PayResultVO getOrderResult(Long userId, Long orderId);

    /**
     * 微信支付主动确认（支付成功后查单补偿）
     *
     * @param userId  用户ID
     * @param orderId 订单ID
     * @return 支付结果
     */
    PayResultVO confirmWechatPay(Long userId, Long orderId);

    /**
     * 处理微信支付回调
     *
     * @param body 微信支付回调原文
     */
    void handleWechatNotify(String body);
}

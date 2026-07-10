package com.spacetime.miniapp.service;

import com.spacetime.common.entity.TradeOrder;
import com.spacetime.miniapp.dto.response.WechatPayParamsVO;

import java.math.BigDecimal;

/**
 * 微信支付服务
 */
public interface WechatPayService {

    /**
     * 创建 JSAPI 支付参数
     *
     * @param order         交易订单，保留业务真实金额
     * @param openid        小程序用户 openid
     * @param paymentAmount 本次提交微信支付网关的实际扣款金额
     * @return 小程序 wx.requestPayment 所需参数
     */
    WechatPayParamsVO createJsapiPayParams(TradeOrder order, String openid, BigDecimal paymentAmount);

    /**
     * 解密并解析微信支付回调
     *
     * @param body 回调原文
     * @return 回调交易信息
     */
    WechatPayNotifyResult parseNotify(String body);

    /**
     * 根据商户订单号主动查询微信支付订单状态。
     *
     * @param orderNo 商户订单号
     * @return 微信支付交易信息
     */
    WechatPayNotifyResult queryOrder(String orderNo);

    /**
     * 微信支付回调交易信息
     */
    record WechatPayNotifyResult(
            String outTradeNo,
            String transactionId,
            String tradeState,
            String rawPayload
    ) {}
}

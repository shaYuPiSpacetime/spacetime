package com.spacetime.miniapp.service;

import com.spacetime.common.entity.TradeOrder;
import com.spacetime.miniapp.dto.response.WechatPayParamsVO;

/**
 * 微信支付服务
 */
public interface WechatPayService {

    /**
     * 创建 JSAPI 支付参数
     *
     * @param order  交易订单
     * @param openid 小程序用户 openid
     * @return 小程序 wx.requestPayment 所需参数
     */
    WechatPayParamsVO createJsapiPayParams(TradeOrder order, String openid);

    /**
     * 解密并解析微信支付回调
     *
     * @param body 回调原文
     * @return 回调交易信息
     */
    WechatPayNotifyResult parseNotify(String body);

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

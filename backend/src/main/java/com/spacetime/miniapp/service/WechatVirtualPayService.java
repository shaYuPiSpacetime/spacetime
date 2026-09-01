package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.WechatVirtualPayParamsVO;

/**
 * 微信小程序虚拟支付服务。
 */
public interface WechatVirtualPayService {

    /** 当前部署是否启用虚拟支付。 */
    boolean isEnabled();

    /** 为 wx.requestVirtualPayment 生成道具直购参数。 */
    WechatVirtualPayParamsVO createPayParams(
            String orderNo,
            String productId,
            int goodsPriceFen,
            String sessionKey
    );

    /** 查询微信虚拟支付现金订单。 */
    VirtualPayOrderResult queryOrder(String openid, String orderNo);

    /** 本地权益发放成功后通知微信完成发货。 */
    void notifyProvideGoods(String orderNo, String wxOrderId);

    /** 微信虚拟支付订单查询结果。 */
    record VirtualPayOrderResult(
            String orderNo,
            String wxOrderId,
            String transactionId,
            int status,
            long paidTime,
            String rawPayload
    ) {
        /** 2：已支付待发货；3：发货中；4：已发货。 */
        public boolean paid() {
            return status >= 2 && status <= 4;
        }

        public boolean delivered() {
            return status == 4;
        }
    }
}

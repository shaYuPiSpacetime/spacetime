package com.spacetime.common.service;

import com.spacetime.common.exception.BusinessException;

/**
 * 微信虚拟支付退款共享网关。
 * 管理端仅依赖此公共契约，避免跨域依赖小程序服务包。
 */
public interface WechatVirtualRefundGateway {

    /**
     * 微信明确返回业务拒绝，能够确定退款请求未被受理。
     */
    class RefundRequestRejectedException extends BusinessException {
        public RefundRequestRejectedException(String message) {
            super(message);
        }
    }

    /**
     * 退款请求已经发出，但因网络或响应异常无法判断微信是否受理。
     */
    class RefundRequestUnknownException extends BusinessException {
        public RefundRequestUnknownException(String message) {
            super(message);
        }
    }

    /**
     * 微信查单响应无法与本地退款单建立唯一对应关系，必须转人工复核。
     */
    class RefundQueryMismatchException extends BusinessException {
        private final String rawPayload;

        public RefundQueryMismatchException(String message, String rawPayload) {
            super(message);
            this.rawPayload = rawPayload;
        }

        public String getRawPayload() {
            return rawPayload;
        }
    }

    /** 当前部署是否启用虚拟支付。 */
    boolean isEnabled();

    /** 查询原支付单当前可退款金额。 */
    VirtualPaymentOrderSnapshot queryPaymentOrder(String openid, String orderNo);

    /** 发起退款任务；返回成功只代表微信已受理任务。 */
    VirtualRefundRequestResult requestRefund(
            String openid,
            String payOrderNo,
            String refundOrderNo,
            int leftFeeFen,
            int refundFeeFen,
            String bizMeta
    );

    /** 查询退款单终态。 */
    VirtualRefundQueryResult queryRefund(String openid, String refundOrderNo);

    /** 原支付单快照。 */
    record VirtualPaymentOrderSnapshot(int status, int leftFeeFen, String rawPayload) {
        public boolean paid() {
            return status >= 2 && status <= 4;
        }
    }

    /** 退款任务受理结果。 */
    record VirtualRefundRequestResult(
            String refundOrderNo,
            String wxRefundOrderNo,
            String payOrderNo,
            String wxPayOrderNo,
            String rawPayload
    ) {
    }

    /** 退款查单结果。 */
    record VirtualRefundQueryResult(
            String refundOrderNo,
            String wxRefundOrderNo,
            int status,
            int orderType,
            int refundFeeFen,
            long refundedTime,
            String rawPayload
    ) {
        /** 微信虚拟支付查单状态 5、8 均表示退款已完成。 */
        public boolean success() {
            return status == 5 || status == 8;
        }

        /** 微信虚拟支付查单状态 7 表示退款失败。 */
        public boolean failed() {
            return status == 7;
        }

        public boolean pending() {
            return !success() && !failed();
        }
    }
}

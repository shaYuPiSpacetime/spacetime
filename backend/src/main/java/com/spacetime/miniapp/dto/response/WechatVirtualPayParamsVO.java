package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 微信小程序虚拟支付客户端参数。
 */
@Data
public class WechatVirtualPayParamsVO {
    /** 微信要求以字符串传递的下单参数 JSON。 */
    private String signData;
    /** 使用虚拟支付 AppKey 计算的支付签名。 */
    private String paySig;
    /** 使用当前微信 session_key 计算的用户态签名。 */
    private String signature;
    /** 支付类型，本项目套餐统一按虚拟道具直购处理。 */
    private String mode = "short_series_goods";
}

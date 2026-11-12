package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * 微信支付配置
 */
@Data
@Component
@ConfigurationProperties(prefix = "wechat-pay")
public class WechatPayProperties {
    /** 小程序 AppID */
    private String appId;
    /** 微信支付商户号 */
    private String mchId;
    /** API v3 密钥 */
    private String apiV3Key;
    /** 商户 API 证书序列号 */
    private String certSerialNo;
    /** 商户 API 私钥路径 */
    private String privateKeyPath;
    /** 商户证书路径，当前预留给验签 */
    private String merchantCertPath;
    /** 支付结果通知地址 */
    private String notifyUrl;
    /** 商品描述前缀 */
    private String descriptionPrefix = "时空邂逅";
    /** 兼容旧环境配置，不再覆盖后台套餐价格。 */
    @Deprecated
    private BigDecimal testAmount;
    /** 兼容旧环境配置，开关不再影响扣款金额。 */
    @Deprecated
    private boolean forceTestAmount;
    /** 兼容旧环境配置，不再作为扣款金额。 */
    @Deprecated
    private BigDecimal testPayAmount = new BigDecimal("1.00");

    /** 页面、订单与支付网关统一使用后台生效套餐价，忽略遗留测试金额。 */
    public BigDecimal resolvePaymentAmount(BigDecimal packageAmount) {
        return packageAmount;
    }
}

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
    /** 测试环境传给微信的覆盖金额；为空时使用套餐真实金额 */
    private BigDecimal testAmount;
}

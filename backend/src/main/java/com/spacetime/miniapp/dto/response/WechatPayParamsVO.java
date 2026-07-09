package com.spacetime.miniapp.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * 微信小程序 JSAPI 支付参数
 */
@Data
public class WechatPayParamsVO {
    /** 支付签名时间戳 */
    private String timeStamp;
    /** 支付签名随机串 */
    private String nonceStr;
    /** 预支付交易会话包 */
    @JsonProperty("package")
    private String packageValue;
    /** 签名方式 */
    private String signType = "RSA";
    /** 支付签名 */
    private String paySign;
    /** 微信预支付交易会话标识，内部落库使用，不返回给小程序支付组件 */
    @JsonIgnore
    private String prepayId;
}

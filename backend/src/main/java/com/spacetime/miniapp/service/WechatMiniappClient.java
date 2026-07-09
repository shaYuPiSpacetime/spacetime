package com.spacetime.miniapp.service;

/**
 * 微信小程序开放接口客户端。
 */
public interface WechatMiniappClient {

    /**
     * 使用 wx.login 的 code 换取 openid。
     * @param loginCode wx.login 返回的临时 code
     * @return 小程序会话信息
     */
    SessionInfo code2Session(String loginCode);

    /**
     * 使用 getPhoneNumber 返回的 code 换取手机号。
     * @param phoneCode getPhoneNumber 返回的手机号授权 code
     * @return 手机号信息
     */
    PhoneInfo getPhoneNumber(String phoneCode);

    /** 微信 jscode2session 响应核心字段 */
    record SessionInfo(String openid, String unionid) {}

    /** 微信 getuserphonenumber 响应核心字段 */
    record PhoneInfo(String phoneNumber, String purePhoneNumber, String countryCode) {}
}

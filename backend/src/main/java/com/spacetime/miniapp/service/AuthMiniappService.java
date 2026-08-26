package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.PhoneSmsCodeReq;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.request.WechatUsageReq;
import com.spacetime.miniapp.dto.response.PhoneSmsCodeVO;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
import com.spacetime.miniapp.dto.response.WechatUsageVO;

/**
 * 小程序认证登录服务。
 */
public interface AuthMiniappService {
    /** 判断微信用户是否使用过小程序；首次使用时创建资料续填会话。 */
    WechatUsageVO resolveWechatUsage(WechatUsageReq req);

    /** 微信授权登录。 */
    WechatLoginVO wechatLogin(WechatLoginReq req);

    /** 发送手机号登录验证码。 */
    PhoneSmsCodeVO sendPhoneSmsCode(PhoneSmsCodeReq req);

    /** 手机号验证码登录。 */
    WechatLoginVO phoneLogin(PhoneLoginReq req);
}

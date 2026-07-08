package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.response.WechatLoginVO;

/**
 * 小程序认证登录服务。
 */
public interface AuthMiniappService {
    /** 微信授权登录。 */
    WechatLoginVO wechatLogin(WechatLoginReq req);

    /** 手机号验证码登录。 */
    WechatLoginVO phoneLogin(PhoneLoginReq req);
}

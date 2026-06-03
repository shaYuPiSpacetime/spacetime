package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.response.WechatLoginVO;

/**
 * 小程序微信授权登录服务
 */
public interface AuthMiniappService {
    /**
     * 微信 code 授权登录
     * @param req 微信登录 code
     * @return token + userId + 是否已完成首登资料
     */
    WechatLoginVO wechatLogin(WechatLoginReq req);
}

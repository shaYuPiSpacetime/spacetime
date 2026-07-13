package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.PhoneLoginReq;
import com.spacetime.miniapp.dto.request.PhoneSmsCodeReq;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.response.PhoneSmsCodeVO;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
import com.spacetime.miniapp.service.AuthMiniappService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 小程序登录接口。
 */
@RestController
@RequestMapping("/miniapp/auth")
@RequiredArgsConstructor
public class AuthMiniappController {

    private final AuthMiniappService authMiniappService;

    /** 微信授权登录。 */
    @PostMapping("/wechat-login")
    public R<WechatLoginVO> wechatLogin(@Valid @RequestBody WechatLoginReq req) {
        return R.ok(authMiniappService.wechatLogin(req));
    }

    /** 发送手机号登录验证码。 */
    @PostMapping("/sms-code")
    public R<PhoneSmsCodeVO> smsCode(@Valid @RequestBody PhoneSmsCodeReq req) {
        return R.ok(authMiniappService.sendPhoneSmsCode(req));
    }

    /** 手机号验证码登录。 */
    @PostMapping("/phone-login")
    public R<WechatLoginVO> phoneLogin(@Valid @RequestBody PhoneLoginReq req) {
        return R.ok(authMiniappService.phoneLogin(req));
    }
}

package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.WechatLoginReq;
import com.spacetime.miniapp.dto.response.WechatLoginVO;
import com.spacetime.miniapp.service.AuthMiniappService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序微信授权登录接口
 */
@RestController
@RequestMapping("/miniapp/auth")
@RequiredArgsConstructor
public class AuthMiniappController {

    private final AuthMiniappService authMiniappService;

    /**
     * 微信 code 授权登录
     * 新用户自动注册，老用户返回登录态；冻结/注销账号拒绝登录
     * @param req 微信登录 code
     * @return token + userId + 是否已完成首登资料
     */
    @PostMapping("/wechat-login")
    public R<WechatLoginVO> wechatLogin(@Valid @RequestBody WechatLoginReq req) {
        return R.ok(authMiniappService.wechatLogin(req));
    }
}

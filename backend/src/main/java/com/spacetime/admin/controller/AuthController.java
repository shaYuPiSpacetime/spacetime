package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;
import com.spacetime.admin.service.AuthService;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.result.R;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台认证接口
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** 管理后台登录 */
    @PostMapping("/login")
    public R<LoginVO> login(@Valid @RequestBody LoginReq req) {
        return R.ok(authService.login(req));
    }

    /** 管理后台退出 */
    @PostMapping("/logout")
    public R<Void> logout(HttpServletRequest request) {
        String token = request.getHeader(AuthConstant.TOKEN_HEADER);
        authService.logout(token);
        return R.ok();
    }
}

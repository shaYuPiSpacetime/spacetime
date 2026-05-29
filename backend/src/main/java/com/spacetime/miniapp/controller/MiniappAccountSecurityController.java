package com.spacetime.miniapp.controller;

import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.MiniappAccountCancelReq;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelStatusVO;
import com.spacetime.miniapp.service.MiniappAccountSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/miniapp")
@RequiredArgsConstructor
public class MiniappAccountSecurityController {
    private final MiniappAccountSecurityService accountSecurityService;

    @GetMapping("/account/cancel-status")
    public R<MiniappAccountCancelStatusVO> cancelStatus() {
        return R.ok(accountSecurityService.cancelStatus(UserContextHolder.get().getId()));
    }

    @PostMapping("/account/cancel")
    public R<Long> applyCancel(@RequestBody MiniappAccountCancelReq req) {
        return R.ok(accountSecurityService.applyCancel(UserContextHolder.get().getId(), req));
    }

    @PostMapping("/account/cancel/revoke")
    public R<Void> revokeCancel() {
        accountSecurityService.revokeCancel(UserContextHolder.get().getId());
        return R.ok();
    }

    @PostMapping("/logout")
    public R<Void> logout(@RequestHeader(value = AuthConstant.TOKEN_HEADER, required = false) String token) {
        accountSecurityService.logout(token);
        return R.ok();
    }
}

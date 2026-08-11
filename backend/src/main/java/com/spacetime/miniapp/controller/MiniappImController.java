package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.ImCredentialVO;
import com.spacetime.miniapp.service.MiniappImService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 小程序腾讯云 TIM 登录凭证接口。 */
@RestController
@RequestMapping("/miniapp/im")
@RequiredArgsConstructor
public class MiniappImController {
    private final MiniappImService imService;

    @GetMapping("/credentials")
    public R<ImCredentialVO> credentials() {
        return R.ok(imService.credentials(currentUserId()));
    }

    private Long currentUserId() {
        UserContext context = UserContextHolder.get();
        if (context == null || context.getId() == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return context.getId();
    }
}

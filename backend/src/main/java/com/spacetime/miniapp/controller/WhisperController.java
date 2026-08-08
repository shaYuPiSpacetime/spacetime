package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.WhisperCreateReq;
import com.spacetime.miniapp.dto.request.WhisperPrecheckReq;
import com.spacetime.miniapp.dto.response.WhisperCreateVO;
import com.spacetime.miniapp.dto.response.WhisperPrecheckVO;
import com.spacetime.miniapp.service.WhisperService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 小程序悄悄话预检查和发送接口。 */
@RestController
@RequestMapping("/miniapp/message/whispers")
@RequiredArgsConstructor
public class WhisperController {
    private final WhisperService whisperService;

    @PostMapping("/precheck")
    public R<WhisperPrecheckVO> precheck(@Valid @RequestBody WhisperPrecheckReq req) {
        return R.ok(whisperService.precheck(currentUserId(), req));
    }

    @PostMapping
    public R<WhisperCreateVO> create(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody WhisperCreateReq req) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new BusinessException(4001, "Idempotency-Key 幂等键不能为空");
        }
        return R.ok(whisperService.create(currentUserId(), idempotencyKey, req));
    }

    private Long currentUserId() {
        UserContext context = UserContextHolder.get();
        if (context == null || context.getId() == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return context.getId();
    }
}

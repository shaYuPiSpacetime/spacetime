package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.InviteSourceTraceReq;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.PromotionInviteQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序邀请推广接口。
 */
@RestController
@RequestMapping("/miniapp/promotion")
@RequiredArgsConstructor
public class PromotionInviteController {
    private final PromotionInviteQueryService service;

    @PostMapping("/source-traces")
    public R<InviteSourceTraceVO> sourceTrace(@Valid @RequestBody InviteSourceTraceReq req) {
        return R.ok(service.createSourceTrace(req.getSourceType(), req.getSourceToken(), req.getVisitorKey()));
    }

    @GetMapping("/invite/home")
    public R<InviteHomeVO> home() {
        return R.ok(service.home(currentUserId()));
    }

    @GetMapping("/invite/records")
    public R<Page<InviteRecordVO>> records(@RequestParam(defaultValue = "1") int page,
                                           @RequestParam(defaultValue = "20") int size,
                                           @RequestParam(defaultValue = "all") String status) {
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException("分页参数不合法");
        }
        return R.ok(service.records(currentUserId(), page, size, status));
    }

    @GetMapping("/invite/rules")
    public R<InviteRulesVO> rules() {
        return R.ok(service.rules());
    }

    private Long currentUserId() {
        UserContext context = UserContextHolder.get();
        if (context == null) throw new BusinessException(401, "未登录或登录已过期");
        return context.getId();
    }
}

package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.service.PromotionInviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 小程序邀请推广控制器
 */
@RestController
@RequestMapping("/miniapp/promotion/invite")
@RequiredArgsConstructor
public class PromotionInviteController {
    private final PromotionInviteService promotionInviteService;

    /** 邀请首页 */
    @GetMapping("/home")
    public R<Map<String, Object>> home() {
        return R.ok(promotionInviteService.home(currentUserId()));
    }

    /** 活动规则 */
    @GetMapping("/rules")
    public R<Map<String, Object>> rules() {
        return R.ok(promotionInviteService.rules());
    }

    /** 邀请记录 */
    @GetMapping("/records")
    public R<Page<PromotionInviteRelation>> records(@RequestParam(defaultValue = "1") int page,
                                                    @RequestParam(defaultValue = "20") int size,
                                                    @RequestParam(required = false) String status) {
        return R.ok(promotionInviteService.records(currentUserId(), page, size, status));
    }

    /** 记录分享/扫码来源 */
    @PostMapping("/share-log")
    public R<PromotionSourceTrace> shareLog(@RequestBody PromotionSourceTrace trace) {
        return R.ok(promotionInviteService.shareLog(trace));
    }

    /** 绑定邀请关系 */
    @PostMapping("/bind")
    public R<PromotionInviteRelation> bind(@RequestBody Map<String, String> body) {
        return R.ok(promotionInviteService.bind(
                currentUserId(),
                body.get("traceNo"),
                body.get("inviteCode"),
                body.get("qrCode")));
    }

    /** 获取普通用户二维码 */
    @GetMapping("/qr-code")
    public R<Map<String, Object>> qrCode() {
        return R.ok(promotionInviteService.qrCode(currentUserId()));
    }

    /** 查询代理来源 */
    @GetMapping("/qr-source")
    public R<Map<String, Object>> qrSource(@RequestParam String qrCode) {
        return R.ok(promotionInviteService.qrSource(qrCode));
    }

    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }
}

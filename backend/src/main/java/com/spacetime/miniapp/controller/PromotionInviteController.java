package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.InviteBindReq;
import com.spacetime.miniapp.dto.request.InviteShareLogReq;
import com.spacetime.miniapp.dto.response.InviteBindVO;
import com.spacetime.miniapp.dto.response.InviteHomeVO;
import com.spacetime.miniapp.dto.response.InviteQrCodeVO;
import com.spacetime.miniapp.dto.response.InviteQrSourceVO;
import com.spacetime.miniapp.dto.response.InviteRecordVO;
import com.spacetime.miniapp.dto.response.InviteRulesVO;
import com.spacetime.miniapp.dto.response.InviteSourceTraceVO;
import com.spacetime.miniapp.service.PromotionInviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
    public R<InviteHomeVO> home() {
        return R.ok(promotionInviteService.home(currentUserId()));
    }

    /** 活动规则 */
    @GetMapping("/rules")
    public R<InviteRulesVO> rules() {
        return R.ok(promotionInviteService.rules());
    }

    /** 邀请记录 */
    @GetMapping("/records")
    public R<Page<InviteRecordVO>> records(@RequestParam(defaultValue = "1") int page,
                                           @RequestParam(defaultValue = "20") int size,
                                           @RequestParam(required = false) String status) {
        return R.ok(promotionInviteService.records(currentUserId(), page, size, status));
    }

    /** 记录分享/扫码来源 */
    @PostMapping("/share-log")
    public R<InviteSourceTraceVO> shareLog(@RequestBody InviteShareLogReq req) {
        return R.ok(promotionInviteService.shareLog(toTrace(req)));
    }

    /** 绑定邀请关系 */
    @PostMapping("/bind")
    public R<InviteBindVO> bind(@RequestBody InviteBindReq body) {
        return R.ok(promotionInviteService.bind(
                currentUserId(),
                body.getTraceNo(),
                body.getInviteCode(),
                body.getQrCode()));
    }

    /** 获取普通用户二维码 */
    @GetMapping("/qr-code")
    public R<InviteQrCodeVO> qrCode() {
        return R.ok(promotionInviteService.qrCode(currentUserId()));
    }

    /** 查询代理来源 */
    @GetMapping("/qr-source")
    public R<InviteQrSourceVO> qrSource(@RequestParam String qrCode) {
        return R.ok(promotionInviteService.qrSource(qrCode));
    }

    private PromotionSourceTrace toTrace(InviteShareLogReq req) {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setTraceNo(req.getTraceNo());
        trace.setSourceType(req.getSourceType());
        trace.setInviterId(req.getInviterId());
        trace.setInviteCode(req.getInviteCode());
        trace.setAgentId(req.getAgentId());
        trace.setQrCode(req.getQrCode());
        trace.setVisitorUserId(req.getVisitorUserId());
        trace.setScene(req.getScene());
        trace.setDeviceHash(req.getDeviceHash());
        trace.setIp(req.getIp());
        return trace;
    }

    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }
}

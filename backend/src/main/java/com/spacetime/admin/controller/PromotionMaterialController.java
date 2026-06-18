package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionReviewReq;
import com.spacetime.admin.dto.response.PromotionAgentQrCodeVO;
import com.spacetime.admin.service.PromotionAgentAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 推广素材与二维码后台控制器。
 */
@RestController
@RequestMapping("/admin/promotion/materials")
@RequiredArgsConstructor
public class PromotionMaterialController {
    private final PromotionAgentAdminService promotionAgentAdminService;

    /** 二维码素材列表 */
    @GetMapping("/list")
    @RequirePermission("promotion:agent:list")
    public R<Page<PromotionAgentQrCodeVO>> list(@RequestParam(required = false) Long agentId,
                                                @RequestParam(required = false) String agentKeyword,
                                                @RequestParam(required = false) String qrCode,
                                                @RequestParam(defaultValue = "1") int page,
                                                @RequestParam(defaultValue = "20") int size,
                                                @RequestParam(required = false) String status) {
        return R.ok(promotionAgentAdminService.materials(agentId, agentKeyword, qrCode, page, size, status));
    }

    /** 重新生成二维码。 */
    @PostMapping("/{id}/regenerate")
    @RequirePermission("promotion:agent:code")
    public R<PromotionAgentQrCodeVO> regenerate(@PathVariable Long id) {
        return R.ok(promotionAgentAdminService.regenerateMaterialCode(id));
    }

    /** 停用二维码展示。 */
    @PutMapping("/{id}/disable")
    @RequirePermission("promotion:agent:code")
    public R<Void> disable(@PathVariable Long id, @RequestBody(required = false) PromotionReviewReq req) {
        promotionAgentAdminService.disableCode(id);
        return R.ok();
    }
}

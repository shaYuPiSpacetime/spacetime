package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionAgentPageReq;
import com.spacetime.admin.dto.request.PromotionAgentSaveReq;
import com.spacetime.admin.dto.request.PromotionStatusUpdateReq;
import com.spacetime.admin.dto.response.PromotionAgentItemVO;
import com.spacetime.admin.dto.response.PromotionAgentQrCodeVO;
import com.spacetime.admin.dto.response.PromotionExportTaskVO;
import com.spacetime.admin.service.PromotionAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 校园推广员后台接口。
 */
@RestController
@RequestMapping("/admin/promotion/agents")
@RequiredArgsConstructor
public class PromotionAgentController {
    private final PromotionAdminService service;

    @GetMapping("/list")
    @RequirePermission("promotion:agent:view")
    public R<Page<PromotionAgentItemVO>> list(@Valid PromotionAgentPageReq req) {
        return R.ok(service.agents(req));
    }

    @PostMapping
    @RequirePermission("promotion:agent:edit")
    public R<PromotionAgentItemVO> create(@Valid @RequestBody PromotionAgentSaveReq req) {
        return R.ok(service.createAgent(req));
    }

    @PutMapping("/{agentNo}")
    @RequirePermission("promotion:agent:edit")
    public R<PromotionAgentItemVO> update(@PathVariable String agentNo,
                                          @Valid @RequestBody PromotionAgentSaveReq req) {
        return R.ok(service.updateAgent(agentNo, req));
    }

    @PutMapping("/{agentNo}/status")
    @RequirePermission("promotion:agent:edit")
    public R<PromotionAgentItemVO> status(@PathVariable String agentNo,
                                          @Valid @RequestBody PromotionStatusUpdateReq req) {
        return R.ok(service.updateAgentStatus(agentNo, req.getStatus()));
    }

    @GetMapping("/{agentNo}")
    @RequirePermission("promotion:agent:view")
    public R<PromotionAgentItemVO> detail(@PathVariable String agentNo) {
        return R.ok(service.agentDetail(agentNo));
    }

    @PostMapping("/{agentNo}/qr-code")
    @RequirePermission("promotion:agent:qrcode")
    public R<PromotionAgentQrCodeVO> qrCode(@PathVariable String agentNo) {
        return R.ok(service.getOrCreateAgentQrCode(agentNo));
    }

    @GetMapping(value = "/{agentNo}/qr-code/image", produces = MediaType.IMAGE_PNG_VALUE)
    @RequirePermission("promotion:agent:qrcode")
    public ResponseEntity<byte[]> qrCodeImage(@PathVariable String agentNo) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_PNG)
                .body(service.agentQrCodePng(agentNo));
    }

    @PostMapping("/export")
    @RequirePermission("promotion:agent:export")
    public R<PromotionExportTaskVO> export(@Valid @RequestBody PromotionAgentPageReq req) {
        return R.ok(service.exportAgents(req));
    }
}

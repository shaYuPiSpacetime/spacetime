package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionAgentPageReq;
import com.spacetime.admin.dto.request.PromotionAgentSaveReq;
import com.spacetime.admin.dto.request.PromotionStatusUpdateReq;
import com.spacetime.admin.dto.response.PromotionAgentCodeVO;
import com.spacetime.admin.dto.response.PromotionAgentVO;
import com.spacetime.admin.service.PromotionAgentAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.entity.PromotionAgentEvent;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;


/**
 * 校园代理后台控制器
 */
@RestController
@RequestMapping("/admin/promotion/agents")
@RequiredArgsConstructor
public class PromotionAgentController {
    private final PromotionAgentAdminService promotionAgentAdminService;

    /** 分页查询代理 */
    @GetMapping("/list")
    @RequirePermission("promotion:agent:list")
    public R<Page<PromotionAgentVO>> list(@Valid PromotionAgentPageReq req) {
        return R.ok(promotionAgentAdminService.list(req));
    }

    /** 查询代理详情 */
    @GetMapping("/{id}")
    @RequirePermission("promotion:agent:list")
    public R<PromotionAgentVO> detail(@PathVariable Long id) {
        return R.ok(promotionAgentAdminService.detail(id));
    }

    /** 新增代理 */
    @PostMapping
    @RequirePermission("promotion:agent:add")
    public R<Long> create(@Valid @RequestBody PromotionAgentSaveReq req) {
        return R.ok(promotionAgentAdminService.create(req));
    }

    /** 编辑代理 */
    @PutMapping("/{id}")
    @RequirePermission("promotion:agent:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody PromotionAgentSaveReq req) {
        promotionAgentAdminService.update(id, req);
        return R.ok();
    }

    /** 更新代理状态 */
    @PutMapping("/{id}/status")
    @RequirePermission("promotion:agent:edit")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody PromotionStatusUpdateReq req) {
        promotionAgentAdminService.updateStatus(id, req.getStatus());
        return R.ok();
    }

    /** 生成或重生成代理码 */
    @PostMapping("/{id}/codes/regenerate")
    @RequirePermission("promotion:agent:code")
    public R<PromotionAgentCodeVO> regenerateCode(@PathVariable Long id) {
        return R.ok(promotionAgentAdminService.regenerateCode(id));
    }

    /** 查询代理推广事件 */
    @GetMapping("/{id}/events")
    @RequirePermission("promotion:agent:list")
    public R<Page<PromotionAgentEvent>> events(@PathVariable Long id,
                                               @RequestParam(defaultValue = "1") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @RequestParam(required = false) String eventType) {
        return R.ok(promotionAgentAdminService.events(id, page, size, eventType));
    }
}

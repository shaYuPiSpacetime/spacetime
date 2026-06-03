package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.request.VipBenefitSaveReq;
import com.spacetime.admin.dto.response.VipBenefitVO;
import com.spacetime.admin.service.VipBenefitAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * VIP 权益配置控制器
 */
@RestController
@RequestMapping("/admin/vip/benefits")
@RequiredArgsConstructor
public class VipBenefitController {
    /** VIP 权益后台服务 */
    private final VipBenefitAdminService vipBenefitAdminService;

    /**
     * 查询全部权益列表
     * @return 权益列表
     */
    @GetMapping("/list")
    @RequirePermission("vip:benefit:list")
    public R<List<VipBenefitVO>> list() {
        return R.ok(vipBenefitAdminService.list());
    }

    /**
     * 查询权益详情
     * @param id 权益ID
     * @return 权益详情
     */
    @GetMapping("/{id}")
    @RequirePermission("vip:benefit:list")
    public R<VipBenefitVO> detail(@PathVariable Long id) {
        return R.ok(vipBenefitAdminService.detail(id));
    }

    /**
     * 新增权益
     * @param req 权益保存请求
     * @return 新权益ID
     */
    @PostMapping
    @RequirePermission("vip:benefit:add")
    public R<Long> create(@Valid @RequestBody VipBenefitSaveReq req) {
        return R.ok(vipBenefitAdminService.create(req));
    }

    /**
     * 编辑权益
     * @param id 权益ID
     * @param req 权益保存请求
     * @return 空响应
     */
    @PutMapping("/{id}")
    @RequirePermission("vip:benefit:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody VipBenefitSaveReq req) {
        vipBenefitAdminService.update(id, req);
        return R.ok();
    }

    /**
     * 启停权益
     * @param id 权益ID
     * @param req 状态更新请求
     * @return 空响应
     */
    @PutMapping("/{id}/status")
    @RequirePermission("vip:benefit:edit")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateReq req) {
        vipBenefitAdminService.updateStatus(id, req.getStatus());
        return R.ok();
    }
}

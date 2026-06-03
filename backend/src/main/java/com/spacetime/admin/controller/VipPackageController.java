package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.dto.response.VipPackageVO;
import com.spacetime.admin.service.VipPackageAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * VIP 套餐配置控制器
 */
@RestController
@RequestMapping("/admin/vip/packages")
@RequiredArgsConstructor
public class VipPackageController {
    /** VIP 套餐后台服务 */
    private final VipPackageAdminService vipPackageAdminService;

    /**
     * 查询全部套餐列表
     * @return 套餐列表
     */
    @GetMapping("/list")
    @RequirePermission("vip:package:list")
    public R<List<VipPackageVO>> list() {
        return R.ok(vipPackageAdminService.list());
    }

    /**
     * 查询套餐详情
     * @param id 套餐ID
     * @return 套餐详情
     */
    @GetMapping("/{id}")
    @RequirePermission("vip:package:list")
    public R<VipPackageVO> detail(@PathVariable Long id) {
        return R.ok(vipPackageAdminService.detail(id));
    }

    /**
     * 新增套餐
     * @param req 套餐保存请求
     * @return 新套餐ID
     */
    @PostMapping
    @RequirePermission("vip:package:add")
    public R<Long> create(@Valid @RequestBody VipPackageSaveReq req) {
        return R.ok(vipPackageAdminService.create(req));
    }

    /**
     * 编辑套餐
     * @param id 套餐ID
     * @param req 套餐保存请求
     * @return 空响应
     */
    @PutMapping("/{id}")
    @RequirePermission("vip:package:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody VipPackageSaveReq req) {
        vipPackageAdminService.update(id, req);
        return R.ok();
    }

    /**
     * 启停套餐
     * @param id 套餐ID
     * @param req 状态更新请求
     * @return 空响应
     */
    @PutMapping("/{id}/status")
    @RequirePermission("vip:package:edit")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateReq req) {
        vipPackageAdminService.updateStatus(id, req.getStatus());
        return R.ok();
    }
}

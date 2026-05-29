package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.CoinPackageVO;
import com.spacetime.admin.service.CoinPackageAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 成家币套餐配置控制器
 */
@RestController
@RequestMapping("/admin/coin/packages")
@RequiredArgsConstructor
public class CoinPackageController {
    private final CoinPackageAdminService coinPackageAdminService;

    /** 查询全部套餐列表 */
    @GetMapping("/list")
    @RequirePermission("coin:package:list")
    public R<List<CoinPackageVO>> list() {
        return R.ok(coinPackageAdminService.list());
    }

    /** 查询套餐详情 */
    @GetMapping("/{id}")
    @RequirePermission("coin:package:list")
    public R<CoinPackageVO> detail(@PathVariable Long id) {
        return R.ok(coinPackageAdminService.detail(id));
    }

    /** 新增套餐 */
    @PostMapping
    @RequirePermission("coin:package:add")
    public R<Long> create(@Valid @RequestBody CoinPackageSaveReq req) {
        return R.ok(coinPackageAdminService.create(req));
    }

    /** 编辑套餐 */
    @PutMapping("/{id}")
    @RequirePermission("coin:package:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody CoinPackageSaveReq req) {
        coinPackageAdminService.update(id, req);
        return R.ok();
    }

    /** 启停套餐 */
    @PutMapping("/{id}/status")
    @RequirePermission("coin:package:edit")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateReq req) {
        coinPackageAdminService.updateStatus(id, req.getStatus());
        return R.ok();
    }
}

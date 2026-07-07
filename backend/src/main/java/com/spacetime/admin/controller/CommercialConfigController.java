package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.CommercialConfigSaveReq;
import com.spacetime.admin.dto.response.CommercialConfigLogVO;
import com.spacetime.admin.dto.response.CommercialConfigVO;
import com.spacetime.admin.dto.response.UserCommercialAssetDetailVO;
import com.spacetime.admin.service.CommercialAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 商业化配置聚合控制器
 */
@RestController
@RequestMapping("/admin/commercial")
@RequiredArgsConstructor
public class CommercialConfigController {
    /** 商业化后台聚合服务 */
    private final CommercialAdminService commercialAdminService;

    /**
     * 查询商业化配置聚合数据
     * @return 商业化配置
     */
    @GetMapping("/config")
    @RequirePermission("commercial:config:view")
    public R<CommercialConfigVO> config() {
        return R.ok(commercialAdminService.getConfig());
    }

    /**
     * 保存商业化配置聚合数据
     * @param req 保存请求
     * @return 保存后的商业化配置
     */
    @PutMapping("/config")
    @RequirePermission("commercial:config:edit")
    public R<CommercialConfigVO> saveConfig(@Valid @RequestBody CommercialConfigSaveReq req) {
        return R.ok(commercialAdminService.saveConfig(req));
    }

    /**
     * 查询商业化配置变更日志
     * @param page 页码
     * @param size 页大小
     * @return 配置变更日志
     */
    @GetMapping("/config/logs")
    @RequirePermission("commercial:config:view")
    public R<Page<CommercialConfigLogVO>> configLogs(@RequestParam(defaultValue = "1") long page,
                                                     @RequestParam(defaultValue = "10") long size) {
        return R.ok(commercialAdminService.getConfigLogs(page, size));
    }

    /**
     * 查询用户商业化资产详情
     * @param userId 用户 ID
     * @return 用户商业化资产详情
     */
    @GetMapping("/users/{userId}/asset-detail")
    @RequirePermission("commercial:user:view")
    public R<UserCommercialAssetDetailVO> userAssetDetail(@PathVariable Long userId) {
        return R.ok(commercialAdminService.getUserAssetDetail(userId));
    }
}

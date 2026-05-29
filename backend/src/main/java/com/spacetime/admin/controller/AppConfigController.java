package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.AppConfigBatchReq;
import com.spacetime.admin.dto.response.AppConfigVO;
import com.spacetime.admin.service.AppConfigAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 应用配置管理控制器
 */
@RestController
@RequestMapping("/admin/content/app-config")
@RequiredArgsConstructor
public class AppConfigController {

    private final AppConfigAdminService appConfigAdminService;

    /**
     * 按分组查询配置列表
     *
     * @param group 配置分组
     * @return 配置列表
     */
    @GetMapping("/list")
    @RequirePermission("content:config:list")
    public R<List<AppConfigVO>> list(@RequestParam String group) {
        return R.ok(appConfigAdminService.list(group));
    }

    /**
     * 按 key 查询单个配置
     *
     * @param configKey 配置键
     * @return 配置详情
     */
    @GetMapping("/{configKey}")
    @RequirePermission("content:config:list")
    public R<AppConfigVO> getByKey(@PathVariable String configKey) {
        return R.ok(appConfigAdminService.getByKey(configKey));
    }

    /**
     * 批量保存配置
     *
     * @param req 批量保存请求
     */
    @PostMapping("/batch")
    @RequirePermission("content:config:edit")
    public R<Void> batchSave(@Valid @RequestBody AppConfigBatchReq req) {
        appConfigAdminService.batchSave(req);
        return R.ok();
    }
}

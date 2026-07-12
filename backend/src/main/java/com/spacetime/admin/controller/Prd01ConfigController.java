package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppConfigBatchReq;
import com.spacetime.admin.dto.request.ContentOperationLogPageReq;
import com.spacetime.admin.dto.response.AppConfigVO;
import com.spacetime.admin.dto.response.ContentOperationLogVO;
import com.spacetime.admin.service.AppConfigAdminService;
import com.spacetime.admin.service.ContentOperationLogAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * PRD01 准入与认证配置入口。
 */
@RestController
@RequestMapping("/admin/prd01/config")
@RequiredArgsConstructor
public class Prd01ConfigController {

    private static final List<String> ALLOWED_GROUPS = List.of(
            "PRD01_ACCESS",
            "PRD01_PROFILE_FIELD",
            "PRD01_UPLOAD",
            "PRD01_AUDIT"
    );

    private final AppConfigAdminService appConfigAdminService;
    private final ContentOperationLogAdminService contentOperationLogAdminService;

    /**
     * 查询 PRD01 配置分组。
     *
     * @param group 配置分组
     * @return 配置列表
     */
    @GetMapping
    @RequirePermission("access:config:list")
    public R<List<AppConfigVO>> list(@RequestParam(defaultValue = "PRD01_ACCESS") String group) {
        validateGroup(group);
        return R.ok(appConfigAdminService.list(group));
    }

    /**
     * 保存 PRD01 配置。
     *
     * @param req 批量配置
     */
    @PostMapping
    @RequirePermission("access:config:edit")
    public R<Void> save(@Valid @RequestBody AppConfigBatchReq req) {
        req.getItems().forEach(item -> validateGroup(item.getConfigGroup()));
        appConfigAdminService.batchSave(req);
        return R.ok();
    }

    /**
     * 分页查询准入配置变更日志，固定每页 5 条。
     *
     * @param req 分页参数
     * @return 变更日志分页
     */
    @GetMapping("/logs")
    @RequirePermission("access:config:list")
    public R<Page<ContentOperationLogVO>> logs(ContentOperationLogPageReq req) {
        req.setBizType("APP_CONFIG");
        req.setSize(5);
        return R.ok(contentOperationLogAdminService.list(req));
    }

    private void validateGroup(String group) {
        if (!ALLOWED_GROUPS.contains(group)) {
            throw new BusinessException("不支持的 PRD01 配置分组: " + group);
        }
    }
}

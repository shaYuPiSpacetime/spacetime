package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ComplianceContentPageReq;
import com.spacetime.admin.dto.request.ComplianceContentSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.ComplianceContentVO;
import com.spacetime.admin.service.ComplianceContentAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 公告与协议配置控制器。
 *
 * <p>页面只管理系统预初始化内容，因此不提供新增和删除接口。</p>
 */
@RestController
@RequestMapping("/admin/mobile-config/compliance")
@RequiredArgsConstructor
public class ComplianceContentController {

    private final ComplianceContentAdminService complianceContentAdminService;

    @GetMapping({"", "/list"})
    @RequirePermission("content:compliance:list")
    public R<Page<ComplianceContentVO>> list(ComplianceContentPageReq req) {
        return R.ok(complianceContentAdminService.list(req));
    }

    @GetMapping("/{id}")
    @RequirePermission("content:compliance:list")
    public R<ComplianceContentVO> detail(@PathVariable Long id) {
        return R.ok(complianceContentAdminService.detail(id));
    }

    @PutMapping("/{id}")
    @RequirePermission("content:compliance:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody ComplianceContentSaveReq req) {
        complianceContentAdminService.update(id, req);
        return R.ok();
    }

    @PutMapping("/{id}/status")
    @RequirePermission("content:compliance:status")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateReq req) {
        complianceContentAdminService.updateStatus(id, req);
        return R.ok();
    }
}

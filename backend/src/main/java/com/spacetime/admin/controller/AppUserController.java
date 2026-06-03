package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.request.UpdateStatusReq;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.AppUserListVO;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 管理后台 — 小程序用户管理接口
 * 提供用户列表分页查询、详情查看、账号状态变更（冻结/解冻）
 */
@RestController
@RequestMapping("/admin/users/app")
@RequiredArgsConstructor
public class AppUserController {

    private final AppUserAdminService appUserAdminService;

    /**
     * 用户列表分页查询
     * @param req 筛选条件（关键词/昵称/学校/性别/状态/认证状态）
     * @return 分页用户列表
     */
    @GetMapping("/list")
    @RequirePermission("user:app:list")
    public R<Page<AppUserListVO>> list(@Valid AppUserPageReq req) {
        return R.ok(appUserAdminService.getUserPage(req));
    }

    /**
     * 用户详情
     * @param id 用户ID
     * @return 用户完整资料 + 认证信息
     */
    @GetMapping("/{id}")
    @RequirePermission("user:app:detail")
    public R<AppUserDetailVO> detail(@PathVariable Long id) {
        return R.ok(appUserAdminService.getUserDetail(id));
    }

    /**
     * 变更用户账号状态（冻结/解冻）
     * @param id 用户ID
     * @param req 目标状态
     */
    @PutMapping("/{id}/status")
    @RequirePermission("user:app:freeze")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusReq req) {
        appUserAdminService.updateUserStatus(id, req.getStatus());
        return R.ok();
    }
}

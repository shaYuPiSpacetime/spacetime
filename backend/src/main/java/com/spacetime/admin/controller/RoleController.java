package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.RoleDetailVO;
import com.spacetime.admin.dto.response.RoleVO;
import com.spacetime.admin.service.RoleService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 角色管理控制器
 */
@RestController
@RequestMapping("/admin/role")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    /** 分页查询角色列表 */
    @GetMapping("/list")
    @RequirePermission("system:role:list")
    public R<Page<RoleVO>> list(@Valid RolePageReq req) {
        return R.ok(roleService.list(req));
    }

    /** 查询全部启用角色（下拉选择用，无需权限校验） */
    @GetMapping("/all")
    public R<List<RoleVO>> all() {
        return R.ok(roleService.all());
    }

    /** 查询角色详情 */
    @GetMapping("/{id}")
    @RequirePermission("system:role:list")
    public R<RoleDetailVO> detail(@PathVariable Long id) {
        return R.ok(roleService.detail(id));
    }

    /** 创建角色 */
    @PostMapping
    @RequirePermission("system:role:add")
    public R<Long> create(@Valid @RequestBody RoleCreateReq req) {
        return R.ok(roleService.create(req));
    }

    /** 更新角色 */
    @PutMapping("/{id}")
    @RequirePermission("system:role:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody RoleUpdateReq req) {
        req.setId(id);
        roleService.update(req);
        return R.ok();
    }

    /** 删除角色 */
    @DeleteMapping("/{id}")
    @RequirePermission("system:role:delete")
    public R<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return R.ok();
    }

    /** 为角色绑定菜单权限 */
    @PutMapping("/{id}/menus")
    @RequirePermission("system:role:edit")
    public R<Void> bindMenus(@PathVariable Long id, @Valid @RequestBody RoleMenuReq req) {
        req.setRoleId(id);
        roleService.bindMenus(req);
        return R.ok();
    }
}

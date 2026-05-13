package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.MenuCreateReq;
import com.spacetime.admin.dto.request.MenuUpdateReq;
import com.spacetime.admin.dto.response.MenuVO;
import com.spacetime.admin.service.MenuService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 菜单权限管理控制器
 */
@RestController
@RequestMapping("/admin/menu")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    /** 平铺查询所有菜单 */
    @GetMapping("/list")
    @RequirePermission("system:menu:list")
    public R<List<MenuVO>> list() {
        return R.ok(menuService.list());
    }

    /** 查询菜单树 */
    @GetMapping("/tree")
    @RequirePermission("system:menu:list")
    public R<List<MenuVO>> tree() {
        return R.ok(menuService.tree());
    }

    /** 查询菜单详情 */
    @GetMapping("/{id}")
    @RequirePermission("system:menu:list")
    public R<MenuVO> detail(@PathVariable Long id) {
        return R.ok(menuService.detail(id));
    }

    /** 创建菜单 */
    @PostMapping
    @RequirePermission("system:menu:add")
    public R<Long> create(@Valid @RequestBody MenuCreateReq req) {
        return R.ok(menuService.create(req));
    }

    /** 更新菜单 */
    @PutMapping("/{id}")
    @RequirePermission("system:menu:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody MenuUpdateReq req) {
        req.setId(id);
        menuService.update(req);
        return R.ok();
    }

    /** 删除菜单（级联删除子菜单） */
    @DeleteMapping("/{id}")
    @RequirePermission("system:menu:delete")
    public R<Void> delete(@PathVariable Long id) {
        menuService.delete(id);
        return R.ok();
    }
}



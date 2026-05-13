package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.UserDetailVO;
import com.spacetime.admin.dto.response.UserVO;
import com.spacetime.admin.service.UserService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 用户管理控制器
 */
@RestController
@RequestMapping("/admin/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** 分页查询用户列表 */
    @GetMapping("/list")
    @RequirePermission("system:user:list")
    public R<Page<UserVO>> list(@Valid UserPageReq req) {
        return R.ok(userService.list(req));
    }

    /** 查询用户详情 */
    @GetMapping("/{id}")
    @RequirePermission("system:user:list")
    public R<UserDetailVO> detail(@PathVariable Long id) {
        return R.ok(userService.detail(id));
    }

    /** 创建用户 */
    @PostMapping
    @RequirePermission("system:user:add")
    public R<Long> create(@Valid @RequestBody UserCreateReq req) {
        return R.ok(userService.create(req));
    }

    /** 更新用户信息 */
    @PutMapping("/{id}")
    @RequirePermission("system:user:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody UserUpdateReq req) {
        req.setId(id);
        userService.update(req);
        return R.ok();
    }

    /** 删除用户 */
    @DeleteMapping("/{id}")
    @RequirePermission("system:user:delete")
    public R<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return R.ok();
    }

    /** 重置用户密码 */
    @PutMapping("/{id}/password")
    @RequirePermission("system:user:edit")
    public R<Void> resetPassword(@PathVariable Long id, @Valid @RequestBody ResetPwdReq req) {
        req.setUserId(id);
        userService.resetPassword(req);
        return R.ok();
    }

    /** 为用户分配角色 */
    @PutMapping("/{id}/roles")
    @RequirePermission("system:user:edit")
    public R<Void> assignRoles(@PathVariable Long id, @Valid @RequestBody UserRoleReq req) {
        req.setUserId(id);
        userService.assignRoles(req);
        return R.ok();
    }
}

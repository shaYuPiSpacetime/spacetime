package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.RouterVO;
import com.spacetime.admin.service.MenuService;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 动态路由控制器，返回当前用户有权访问的菜单树
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class RouterController {

    private final MenuService menuService;

    /** 获取当前用户的动态路由树（侧边栏用） */
    @GetMapping("/routers")
    public R<List<RouterVO>> getRouters() {
        UserContext ctx = UserContextHolder.get();
        return R.ok(menuService.getUserRouters(ctx.getId()));
    }
}

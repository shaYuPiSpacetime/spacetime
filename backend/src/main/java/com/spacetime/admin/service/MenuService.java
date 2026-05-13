package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.MenuCreateReq;
import com.spacetime.admin.dto.request.MenuUpdateReq;
import com.spacetime.admin.dto.response.MenuVO;
import com.spacetime.admin.dto.response.RouterVO;

import java.util.List;

/**
 * 菜单权限管理服务接口
 */
public interface MenuService {
    /** 平铺查询所有菜单 */
    List<MenuVO> list();
    /** 查询菜单树 */
    List<MenuVO> tree();
    /** 查询菜单详情 */
    MenuVO detail(Long id);
    /** 创建菜单，返回新菜单 ID */
    Long create(MenuCreateReq req);
    /** 更新菜单 */
    void update(MenuUpdateReq req);
    /** 删除菜单（级联删除子菜单） */
    void delete(Long id);
    /** 查询用户有权限的路由树（动态侧边栏用） */
    List<RouterVO> getUserRouters(Long userId);
}

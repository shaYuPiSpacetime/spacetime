package com.spacetime.admin.service.impl;

import com.spacetime.admin.dto.request.MenuCreateReq;
import com.spacetime.admin.dto.request.MenuUpdateReq;
import com.spacetime.admin.dto.response.MenuVO;
import com.spacetime.admin.dto.response.MetaVO;
import com.spacetime.admin.dto.response.RouterVO;
import com.spacetime.admin.service.MenuService;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.dao.RoleMenuDao;
import com.spacetime.common.entity.SysMenu;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.MenuTypeEnum;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 菜单权限管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {

    private final MenuDao menuDao;
    private final RoleMenuDao roleMenuDao;

    /** 查询全部菜单并构建树结构 */
    @Override
    public List<MenuVO> list() {
        List<SysMenu> all = menuDao.selectAll();
        return buildTree(all).stream()
                .sorted(Comparator.comparing(MenuVO::getMenuSort))
                .collect(Collectors.toList());
    }

    /** 查询菜单树（同 list，返回树结构） */
    @Override
    public List<MenuVO> tree() {
        return list();
    }

    /** 查询单个菜单详情 */
    @Override
    public MenuVO detail(Long id) {
        SysMenu menu = menuDao.selectById(id);
        if (menu == null) return null;
        return toVO(menu);
    }

    /** 创建菜单 */
    @Override
    @Transactional
    public Long create(MenuCreateReq req) {
        SysMenu menu = new SysMenu();
        menu.setParentId(req.getParentId() != null ? req.getParentId() : 0L);
        menu.setMenuName(req.getMenuName());
        menu.setMenuType(req.getMenuType());
        menu.setPath(req.getPath());
        menu.setComponent(req.getComponent());
        menu.setIcon(req.getIcon());
        menu.setPerms(req.getPerms());
        menu.setMenuSort(req.getMenuSort() != null ? req.getMenuSort() : 0);
        menu.setStatus(req.getStatus() != null ? req.getStatus() : CommonStatusEnum.ENABLED.getCode());
        menu.setVisible(req.getVisible() != null ? req.getVisible() : 1);
        menu.setRemark(req.getRemark());
        menuDao.insert(menu);
        log.info("menu created: id={}, menuName={}, menuType={}", menu.getId(), menu.getMenuName(), menu.getMenuType());
        return menu.getId();
    }

    /** 更新菜单 */
    @Override
    @Transactional
    public void update(MenuUpdateReq req) {
        SysMenu menu = menuDao.selectById(req.getId());
        if (menu == null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "菜单不存在");
        }
        menu.setParentId(req.getParentId() != null ? req.getParentId() : menu.getParentId());
        menu.setMenuName(req.getMenuName());
        menu.setMenuType(req.getMenuType());
        menu.setPath(req.getPath());
        menu.setComponent(req.getComponent());
        menu.setIcon(req.getIcon());
        menu.setPerms(req.getPerms());
        menu.setMenuSort(req.getMenuSort());
        menu.setStatus(req.getStatus());
        menu.setVisible(req.getVisible());
        menu.setRemark(req.getRemark());
        menuDao.updateById(menu);
        log.info("menu updated: id={}, menuName={}", menu.getId(), menu.getMenuName());
    }

    /** 删除菜单：递归收集所有子节点，级联删除菜单和角色-菜单关联 */
    @Override
    @Transactional
    public void delete(Long id) {
        SysMenu menu = menuDao.selectById(id);
        if (menu == null) return;
        List<SysMenu> all = menuDao.selectAll();
        // 1. 递归收集所有子菜单 ID
        List<Long> childIds = collectChildIds(all, id);
        childIds.add(id);
        // 2. 级联删除菜单及关联
        for (Long cid : childIds) {
            menuDao.deleteById(cid);
            roleMenuDao.deleteByMenuId(cid);
        }
        log.info("menu deleted: id={}, cascadedIds={}", id, childIds);
    }

    /** 查询用户有权限的动态路由树（仅 M/C 且 visible=1） */
    @Override
    public List<RouterVO> getUserRouters(Long userId) {
        List<SysMenu> menus = menuDao.selectRoutersByUserId(userId);
        return buildRouterTree(menus, 0L);
    }

    /** 递归收集指定节点的所有子孙 ID（含直接子节点） */
    private List<Long> collectChildIds(List<SysMenu> all, Long parentId) {
        List<Long> ids = new ArrayList<>();
        for (SysMenu m : all) {
            if (parentId.equals(m.getParentId())) {
                ids.add(m.getId());
                ids.addAll(collectChildIds(all, m.getId()));
            }
        }
        return ids;
    }

    /** 从平铺菜单列表构建树结构（parentId=0 为根） */
    private List<MenuVO> buildTree(List<SysMenu> all) {
        List<MenuVO> roots = all.stream()
                .filter(m -> m.getParentId() == 0)
                .map(this::toVO)
                .sorted(Comparator.comparing(MenuVO::getMenuSort))
                .collect(Collectors.toList());
        for (MenuVO root : roots) {
            fillChildren(root, all);
        }
        return roots;
    }

    /** 递归填充子菜单 */
    private void fillChildren(MenuVO parent, List<SysMenu> all) {
        List<MenuVO> children = all.stream()
                .filter(m -> parent.getId().equals(m.getParentId()))
                .map(this::toVO)
                .sorted(Comparator.comparing(MenuVO::getMenuSort))
                .collect(Collectors.toList());
        parent.setChildren(children);
        for (MenuVO child : children) {
            fillChildren(child, all);
        }
    }

    /** 从菜单列表构建前端路由树：目录类型继续递归子路由 */
    private List<RouterVO> buildRouterTree(List<SysMenu> menus, Long parentId) {
        List<RouterVO> result = new ArrayList<>();
        List<SysMenu> children = menus.stream()
                .filter(m -> parentId.equals(m.getParentId()))
                .sorted(Comparator.comparing(SysMenu::getMenuSort))
                .toList();
        for (SysMenu m : children) {
            RouterVO router = new RouterVO();
            router.setId(m.getId());
            router.setParentId(m.getParentId());
            router.setName(m.getMenuName());
            router.setPath(m.getPath());
            router.setComponent(m.getComponent());
            router.setSort(m.getMenuSort());
            MetaVO meta = new MetaVO(m.getMenuName(), m.getIcon());
            router.setMeta(meta);
            if (MenuTypeEnum.DIRECTORY.getCode().equals(m.getMenuType())) {
                router.setChildren(buildRouterTree(menus, m.getId()));
            }
            result.add(router);
        }
        return result;
    }

    private MenuVO toVO(SysMenu menu) {
        MenuVO vo = new MenuVO();
        vo.setId(menu.getId());
        vo.setParentId(menu.getParentId());
        vo.setMenuName(menu.getMenuName());
        vo.setMenuType(menu.getMenuType());
        vo.setPath(menu.getPath());
        vo.setComponent(menu.getComponent());
        vo.setIcon(menu.getIcon());
        vo.setPerms(menu.getPerms());
        vo.setMenuSort(menu.getMenuSort());
        vo.setStatus(menu.getStatus());
        vo.setVisible(menu.getVisible());
        vo.setRemark(menu.getRemark());
        return vo;
    }
}

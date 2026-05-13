package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.RoleDetailVO;
import com.spacetime.admin.dto.response.RoleVO;

import java.util.List;

/**
 * 角色管理服务接口
 */
public interface RoleService {
    /** 分页查询角色列表 */
    Page<RoleVO> list(RolePageReq req);
    /** 查询全部启用角色（下拉选择用） */
    List<RoleVO> all();
    /** 查询角色详情（含菜单 ID 列表） */
    RoleDetailVO detail(Long id);
    /** 创建角色，返回新角色 ID */
    Long create(RoleCreateReq req);
    /** 更新角色 */
    void update(RoleUpdateReq req);
    /** 删除角色 */
    void delete(Long id);
    /** 为角色绑定菜单权限 */
    void bindMenus(RoleMenuReq req);
}

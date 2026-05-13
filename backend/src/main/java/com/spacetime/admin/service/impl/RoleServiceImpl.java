package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.RoleDetailVO;
import com.spacetime.admin.dto.response.RoleVO;
import com.spacetime.admin.service.RoleService;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.dao.RoleDao;
import com.spacetime.common.dao.RoleMenuDao;
import com.spacetime.common.dao.UserRoleDao;
import com.spacetime.common.entity.SysRole;
import com.spacetime.common.entity.SysRoleMenu;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 角色管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleDao roleDao;
    private final MenuDao menuDao;
    private final RoleMenuDao roleMenuDao;
    private final UserRoleDao userRoleDao;

    /** 分页查询角色列表 */
    @Override
    public Page<RoleVO> list(RolePageReq req) {
        LambdaQueryWrapper<SysRole> wrapper = new LambdaQueryWrapper<SysRole>()
                .like(StrUtil.isNotBlank(req.getKeyword()), SysRole::getRoleName, req.getKeyword())
                .eq(StrUtil.isNotBlank(req.getStatus()), SysRole::getStatus, req.getStatus())
                .orderByAsc(SysRole::getRoleSort);
        Page<SysRole> page = roleDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<RoleVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    /** 查询全部启用角色，用于下拉选择 */
    @Override
    public List<RoleVO> all() {
        return roleDao.selectAllEnabled().stream().map(this::toVO).toList();
    }

    /** 查询角色详情（含菜单 ID 列表） */
    @Override
    public RoleDetailVO detail(Long id) {
        SysRole role = roleDao.selectById(id);
        if (role == null) return null;
        RoleDetailVO vo = new RoleDetailVO();
        vo.setId(role.getId());
        vo.setRoleName(role.getRoleName());
        vo.setRoleCode(role.getRoleCode());
        vo.setRoleGroup(role.getRoleGroup());
        vo.setRoleSort(role.getRoleSort());
        vo.setStatus(role.getStatus());
        vo.setRemark(role.getRemark());
        vo.setCreateTime(role.getCreateTime());
        vo.setMenuIds(menuDao.selectMenuIdsByRoleId(id));
        return vo;
    }

    /** 创建角色，校验编码唯一性 */
    @Override
    @Transactional
    public Long create(RoleCreateReq req) {
        SysRole exist = roleDao.selectByCode(req.getRoleCode());
        if (exist != null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "角色编码已存在");
        }
        SysRole role = new SysRole();
        role.setRoleName(req.getRoleName());
        role.setRoleCode(req.getRoleCode());
        role.setRoleGroup(req.getRoleGroup() != null ? req.getRoleGroup() : "DEFAULT");
        role.setRoleSort(req.getRoleSort() != null ? req.getRoleSort() : 0);
        role.setStatus(req.getStatus() != null ? req.getStatus() : CommonStatusEnum.ENABLED.getCode());
        role.setRemark(req.getRemark());
        roleDao.insert(role);
        log.info("role created: id={}, roleName={}, roleCode={}", role.getId(), role.getRoleName(), role.getRoleCode());
        return role.getId();
    }

    /** 更新角色，校验编码未被其他角色占用 */
    @Override
    @Transactional
    public void update(RoleUpdateReq req) {
        SysRole role = roleDao.selectById(req.getId());
        if (role == null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "角色不存在");
        }
        SysRole byCode = roleDao.selectByCode(req.getRoleCode());
        if (byCode != null && !byCode.getId().equals(req.getId())) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "角色编码已被其他角色使用");
        }
        role.setRoleName(req.getRoleName());
        role.setRoleCode(req.getRoleCode());
        role.setRoleGroup(req.getRoleGroup());
        role.setRoleSort(req.getRoleSort());
        role.setStatus(req.getStatus());
        role.setRemark(req.getRemark());
        roleDao.updateById(role);
        log.info("role updated: id={}, roleName={}", role.getId(), role.getRoleName());
    }

    /** 删除角色，同时清理角色-菜单和用户-角色关联 */
    @Override
    @Transactional
    public void delete(Long id) {
        roleDao.deleteById(id);
        roleMenuDao.deleteByRoleId(id);
        userRoleDao.deleteByRoleId(id);
        log.info("role deleted: id={}", id);
    }

    /** 为角色绑定菜单：先清除旧关联，再批量插入新关联 */
    @Override
    @Transactional
    public void bindMenus(RoleMenuReq req) {
        // 1. 清除旧关联
        roleMenuDao.deleteByRoleId(req.getRoleId());
        // 2. 批量插入新关联
        if (req.getMenuIds() != null && !req.getMenuIds().isEmpty()) {
            List<SysRoleMenu> list = new ArrayList<>();
            for (Long menuId : req.getMenuIds()) {
                SysRoleMenu rm = new SysRoleMenu();
                rm.setRoleId(req.getRoleId());
                rm.setMenuId(menuId);
                list.add(rm);
            }
            roleMenuDao.batchInsert(list);
        }
        log.info("role menus bound: roleId={}, menuIds={}", req.getRoleId(), req.getMenuIds());
    }

    private RoleVO toVO(SysRole role) {
        RoleVO vo = new RoleVO();
        vo.setId(role.getId());
        vo.setRoleName(role.getRoleName());
        vo.setRoleCode(role.getRoleCode());
        vo.setRoleGroup(role.getRoleGroup());
        vo.setRoleSort(role.getRoleSort());
        vo.setStatus(role.getStatus());
        vo.setRemark(role.getRemark());
        vo.setCreateTime(role.getCreateTime());
        return vo;
    }
}

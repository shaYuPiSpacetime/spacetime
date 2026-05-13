package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.RoleDao;
import com.spacetime.common.entity.SysRole;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.SysRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 角色数据访问层实现
 */
@Repository
@RequiredArgsConstructor
public class RoleDaoImpl implements RoleDao {

    private final SysRoleMapper roleMapper;

    @Override
    public SysRole selectById(Long id) {
        return roleMapper.selectById(id);
    }

    @Override
    public SysRole selectByCode(String roleCode) {
        return roleMapper.selectOne(new LambdaQueryWrapper<SysRole>()
                .eq(SysRole::getRoleCode, roleCode));
    }

    @Override
    public Page<SysRole> selectPage(Page<SysRole> page, LambdaQueryWrapper<SysRole> wrapper) {
        return roleMapper.selectPage(page, wrapper);
    }

    @Override
    public List<SysRole> selectAllEnabled() {
        return roleMapper.selectList(new LambdaQueryWrapper<SysRole>()
                .eq(SysRole::getStatus, CommonStatusEnum.ENABLED.getCode())
                .orderByAsc(SysRole::getRoleSort));
    }

    @Override
    public List<SysRole> selectBatchIds(List<Long> ids) {
        return roleMapper.selectBatchIds(ids);
    }

    @Override
    public void insert(SysRole role) {
        roleMapper.insert(role);
    }

    @Override
    public void updateById(SysRole role) {
        roleMapper.updateById(role);
    }

    @Override
    public void deleteById(Long id) {
        roleMapper.deleteById(id);
    }
}

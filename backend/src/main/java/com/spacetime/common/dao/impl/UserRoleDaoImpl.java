package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.UserRoleDao;
import com.spacetime.common.entity.SysUserRole;
import com.spacetime.common.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 用户-角色关联数据访问层实现
 */
@Repository
@RequiredArgsConstructor
public class UserRoleDaoImpl implements UserRoleDao {

    private final SysUserRoleMapper userRoleMapper;

    @Override
    public void deleteByUserId(Long userId) {
        userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>()
                .eq(SysUserRole::getUserId, userId));
    }

    @Override
    public void deleteByRoleId(Long roleId) {
        userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>()
                .eq(SysUserRole::getRoleId, roleId));
    }

    @Override
    public List<SysUserRole> selectByUserId(Long userId) {
        return userRoleMapper.selectList(new LambdaQueryWrapper<SysUserRole>()
                .eq(SysUserRole::getUserId, userId));
    }

    @Override
    public void batchInsert(List<SysUserRole> list) {
        if (list != null && !list.isEmpty()) {
            for (SysUserRole ur : list) {
                userRoleMapper.insert(ur);
            }
        }
    }
}

package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 用户数据访问层实现
 */
@Repository
@RequiredArgsConstructor
public class UserDaoImpl implements UserDao {

    private final SysUserMapper sysUserMapper;

    @Override
    public SysUser selectByUsername(String username) {
        return sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username));
    }

    @Override
    public SysUser selectById(Long id) {
        return sysUserMapper.selectById(id);
    }

    @Override
    public Page<SysUser> selectPage(Page<SysUser> page, LambdaQueryWrapper<SysUser> wrapper) {
        return sysUserMapper.selectPage(page, wrapper);
    }
}

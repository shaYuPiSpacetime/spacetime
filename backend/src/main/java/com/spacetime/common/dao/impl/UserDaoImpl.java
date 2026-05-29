package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.stereotype.Repository;

import java.util.List;

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
    public SysUser selectByUsernameOrPhone(String account) {
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, account));
        if (user == null) {
            user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                    .eq(SysUser::getPhone, account));
        }
        return user;
    }

    @Override
    public SysUser selectById(Long id) {
        return sysUserMapper.selectById(id);
    }

    @Override
    public Page<SysUser> selectPage(Page<SysUser> page, LambdaQueryWrapper<SysUser> wrapper) {
        return sysUserMapper.selectPage(page, wrapper);
    }

    @Override
    public Page<SysUser> search(Page<SysUser> page, String keyword) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(SysUser::getUsername, keyword)
                    .or()
                    .like(SysUser::getNickname, keyword)
                    .or()
                    .like(SysUser::getPhone, keyword));
        }
        wrapper.orderByDesc(SysUser::getCreateTime);
        return sysUserMapper.selectPage(page, wrapper);
    }

    @Override
    public List<SysUser> selectByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return sysUserMapper.selectBatchIds(ids);
    }

    @Override
    public void insert(SysUser user) {
        sysUserMapper.insert(user);
    }

    @Override
    public void updateById(SysUser user) {
        sysUserMapper.updateById(user);
    }

    @Override
    public void deleteById(Long id) {
        sysUserMapper.deleteById(id);
    }
}

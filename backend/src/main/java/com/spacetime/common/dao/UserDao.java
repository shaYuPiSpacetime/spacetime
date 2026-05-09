package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.SysUser;

/**
 * 用户数据访问层接口
 */
public interface UserDao {
    /** 按用户名查询用户 */
    SysUser selectByUsername(String username);
    /** 按 ID 查询用户 */
    SysUser selectById(Long id);
    /** 分页查询用户 */
    Page<SysUser> selectPage(Page<SysUser> page, LambdaQueryWrapper<SysUser> wrapper);
}

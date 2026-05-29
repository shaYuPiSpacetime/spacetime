package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.SysUser;

import java.util.List;

/**
 * 用户数据访问层接口
 */
public interface UserDao {
    /** 按用户名查询用户 */
    SysUser selectByUsername(String username);
    /** 按用户名或手机号查询用户 */
    SysUser selectByUsernameOrPhone(String account);
    /** 按 ID 查询用户 */
    SysUser selectById(Long id);
    /** 分页查询用户 */
    Page<SysUser> selectPage(Page<SysUser> page, LambdaQueryWrapper<SysUser> wrapper);
    /** 轻量搜索用户 */
    Page<SysUser> search(Page<SysUser> page, String keyword);
    /** 按 ID 批量查询 */
    List<SysUser> selectByIds(List<Long> ids);
    /** 插入用户 */
    void insert(SysUser user);
    /** 按 ID 更新用户 */
    void updateById(SysUser user);
    /** 按 ID 删除用户 */
    void deleteById(Long id);
}

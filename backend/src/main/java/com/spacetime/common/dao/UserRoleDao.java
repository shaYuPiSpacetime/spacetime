package com.spacetime.common.dao;

import com.spacetime.common.entity.SysUserRole;

import java.util.List;

/**
 * 用户-角色关联数据访问层接口
 */
public interface UserRoleDao {
    /** 按用户 ID 删除所有关联 */
    void deleteByUserId(Long userId);
    /** 按角色 ID 删除所有关联 */
    void deleteByRoleId(Long roleId);
    /** 按用户 ID 查询关联列表 */
    List<SysUserRole> selectByUserId(Long userId);
    /** 批量插入关联 */
    void batchInsert(List<SysUserRole> list);
}

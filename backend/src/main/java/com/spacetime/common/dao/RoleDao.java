package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.SysRole;

import java.util.List;

/**
 * 角色数据访问层接口
 */
public interface RoleDao {
    /** 按 ID 查询角色 */
    SysRole selectById(Long id);
    /** 按编码查询角色 */
    SysRole selectByCode(String roleCode);
    /** 分页查询角色 */
    Page<SysRole> selectPage(Page<SysRole> page, LambdaQueryWrapper<SysRole> wrapper);
    /** 查询全部启用角色（按排序号升序） */
    List<SysRole> selectAllEnabled();
    /** 批量按 ID 查询角色 */
    List<SysRole> selectBatchIds(List<Long> ids);
    /** 插入角色 */
    void insert(SysRole role);
    /** 按 ID 更新角色 */
    void updateById(SysRole role);
    /** 按 ID 删除角色 */
    void deleteById(Long id);
}

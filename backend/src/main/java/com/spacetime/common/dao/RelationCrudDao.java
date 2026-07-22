package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import java.util.List;

/** 关系事实表只读分页与受控状态更新的通用 DAO 契约。 */
public interface RelationCrudDao<T> {
    /** 按主键查询。 */
    T selectById(Long id);
    /** 按条件查询单条。 */
    T selectOne(LambdaQueryWrapper<T> wrapper);
    /** 按条件查询列表。 */
    List<T> selectList(LambdaQueryWrapper<T> wrapper);
    /** 按条件分页。 */
    Page<T> selectPage(Page<T> page, LambdaQueryWrapper<T> wrapper);
    /** 按条件计数。 */
    long count(LambdaQueryWrapper<T> wrapper);
    /** 新增关系事实。 */
    void insert(T entity);
    /** 按主键更新状态。 */
    void updateById(T entity);
    /** 按条件批量更新状态，不提供删除能力。 */
    int update(LambdaUpdateWrapper<T> wrapper);
}

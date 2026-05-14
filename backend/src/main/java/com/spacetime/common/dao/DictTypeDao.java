package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.SysDictType;

import java.util.List;

/**
 * 字典类型数据访问接口
 */
public interface DictTypeDao {
    /** 按 ID 查询 */
    SysDictType selectById(Long id);
    /** 按编码查询（唯一） */
    SysDictType selectByCode(String dictType);
    /** 分页查询 */
    Page<SysDictType> selectPage(Page<SysDictType> page, LambdaQueryWrapper<SysDictType> wrapper);
    /** 查询全部 */
    List<SysDictType> selectAll();
    /** 新增 */
    void insert(SysDictType entity);
    /** 更新 */
    void updateById(SysDictType entity);
    /** 删除 */
    void deleteById(Long id);
}

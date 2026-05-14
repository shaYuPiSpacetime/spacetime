package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.entity.SysDictData;

import java.util.List;

/**
 * 字典数据数据访问接口
 */
public interface DictDataDao {
    /** 按 ID 查询 */
    SysDictData selectById(Long id);
    /** 按字典类型编码查询全部数据 */
    List<SysDictData> selectByDictType(String dictType);
    /** 按条件查询列表 */
    List<SysDictData> selectList(LambdaQueryWrapper<SysDictData> wrapper);
    /** 新增 */
    void insert(SysDictData entity);
    /** 更新 */
    void updateById(SysDictData entity);
    /** 删除 */
    void deleteById(Long id);
    /** 按字典类型编码删除全部数据 */
    void deleteByDictType(String dictType);
}

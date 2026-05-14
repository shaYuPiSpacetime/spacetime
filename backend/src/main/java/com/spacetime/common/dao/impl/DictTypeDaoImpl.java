package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.DictTypeDao;
import com.spacetime.common.entity.SysDictType;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.SysDictTypeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 字典类型数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class DictTypeDaoImpl implements DictTypeDao {

    private final SysDictTypeMapper dictTypeMapper;

    @Override
    public SysDictType selectById(Long id) {
        return dictTypeMapper.selectById(id);
    }

    @Override
    public SysDictType selectByCode(String dictType) {
        return dictTypeMapper.selectOne(
                new LambdaQueryWrapper<SysDictType>().eq(SysDictType::getDictType, dictType));
    }

    @Override
    public Page<SysDictType> selectPage(Page<SysDictType> page, LambdaQueryWrapper<SysDictType> wrapper) {
        return dictTypeMapper.selectPage(page, wrapper);
    }

    @Override
    public List<SysDictType> selectAll() {
        return dictTypeMapper.selectList(
                new LambdaQueryWrapper<SysDictType>()
                        .eq(SysDictType::getStatus, CommonStatusEnum.ENABLED.getCode())
                        .orderByAsc(SysDictType::getDictSort));
    }

    @Override
    public void insert(SysDictType entity) {
        dictTypeMapper.insert(entity);
    }

    @Override
    public void updateById(SysDictType entity) {
        dictTypeMapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        dictTypeMapper.deleteById(id);
    }
}

package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.SysDictDataMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 字典数据数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class DictDataDaoImpl implements DictDataDao {

    private final SysDictDataMapper dictDataMapper;

    @Override
    public SysDictData selectById(Long id) {
        return dictDataMapper.selectById(id);
    }

    @Override
    public List<SysDictData> selectByDictType(String dictType) {
        return dictDataMapper.selectList(
                new LambdaQueryWrapper<SysDictData>()
                        .eq(SysDictData::getDictType, dictType)
                        .eq(SysDictData::getStatus, CommonStatusEnum.ENABLED.getCode())
                        .orderByAsc(SysDictData::getDictSort));
    }

    @Override
    public List<SysDictData> selectList(LambdaQueryWrapper<SysDictData> wrapper) {
        return dictDataMapper.selectList(wrapper);
    }

    @Override
    public void insert(SysDictData entity) {
        dictDataMapper.insert(entity);
    }

    @Override
    public void updateById(SysDictData entity) {
        dictDataMapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        dictDataMapper.deleteById(id);
    }

    @Override
    public void deleteByDictType(String dictType) {
        dictDataMapper.delete(
                new LambdaQueryWrapper<SysDictData>().eq(SysDictData::getDictType, dictType));
    }
}

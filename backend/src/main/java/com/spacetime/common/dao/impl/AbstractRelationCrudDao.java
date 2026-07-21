package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.RelationCrudDao;

import java.util.List;

/** 关系事实表 DAO 的公共 MyBatis-Plus 实现，不暴露删除方法。 */
abstract class AbstractRelationCrudDao<T> implements RelationCrudDao<T> {
    /** 仅 DAOImpl 层持有 MyBatis Mapper。 */
    private final BaseMapper<T> mapper;

    protected AbstractRelationCrudDao(BaseMapper<T> mapper) {
        this.mapper = mapper;
    }

    @Override
    public T selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public T selectOne(LambdaQueryWrapper<T> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public List<T> selectList(LambdaQueryWrapper<T> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public Page<T> selectPage(Page<T> page, LambdaQueryWrapper<T> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public long count(LambdaQueryWrapper<T> wrapper) {
        return mapper.selectCount(wrapper);
    }

    @Override
    public void insert(T entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(T entity) {
        mapper.updateById(entity);
    }

    @Override
    public int update(LambdaUpdateWrapper<T> wrapper) {
        return mapper.update(wrapper);
    }
}

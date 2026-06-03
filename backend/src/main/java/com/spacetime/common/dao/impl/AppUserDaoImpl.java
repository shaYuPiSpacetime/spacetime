package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.mapper.AppUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 小程序用户数据访问实现
 * 六层架构：DAOImpl 是唯一可调用 MyBatis Mapper 的层
 */
@Repository
@RequiredArgsConstructor
public class AppUserDaoImpl implements AppUserDao {
    private final AppUserMapper mapper;

    @Override
    public AppUser selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUser selectOne(LambdaQueryWrapper<AppUser> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUser> selectPage(Page<AppUser> page, LambdaQueryWrapper<AppUser> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUser> selectList(LambdaQueryWrapper<AppUser> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUser entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUser entity) {
        mapper.updateById(entity);
    }
}

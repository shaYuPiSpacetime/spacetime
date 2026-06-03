package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.mapper.AppUserVerificationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 用户认证审核数据访问实现
 * 六层架构：DAOImpl 是唯一可调用 MyBatis Mapper 的层
 */
@Repository
@RequiredArgsConstructor
public class AppUserVerificationDaoImpl implements AppUserVerificationDao {
    private final AppUserVerificationMapper mapper;

    @Override
    public AppUserVerification selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserVerification selectOne(LambdaQueryWrapper<AppUserVerification> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUserVerification> selectPage(Page<AppUserVerification> page, LambdaQueryWrapper<AppUserVerification> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserVerification> selectList(LambdaQueryWrapper<AppUserVerification> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserVerification entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserVerification entity) {
        mapper.updateById(entity);
    }
}

package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserCancelRequestDao;
import com.spacetime.common.entity.AppUserCancelRequest;
import com.spacetime.common.enums.CancelRequestStatusEnum;
import com.spacetime.common.mapper.AppUserCancelRequestMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AppUserCancelRequestDaoImpl implements AppUserCancelRequestDao {
    private final AppUserCancelRequestMapper mapper;

    @Override
    public AppUserCancelRequest selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserCancelRequest selectLatestByUserId(Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppUserCancelRequest>()
                .eq(AppUserCancelRequest::getUserId, userId)
                .orderByDesc(AppUserCancelRequest::getCreateTime)
                .last("LIMIT 1"));
    }

    @Override
    public AppUserCancelRequest selectCoolingOffByUserId(Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppUserCancelRequest>()
                .eq(AppUserCancelRequest::getUserId, userId)
                .eq(AppUserCancelRequest::getStatus, CancelRequestStatusEnum.COOLING_OFF.getCode())
                .last("LIMIT 1"));
    }

    @Override
    public Page<AppUserCancelRequest> selectPage(Page<AppUserCancelRequest> page, LambdaQueryWrapper<AppUserCancelRequest> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(AppUserCancelRequest entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserCancelRequest entity) {
        mapper.updateById(entity);
    }
}

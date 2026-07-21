package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserCancelRemarkDao;
import com.spacetime.common.entity.AppUserCancelRemark;
import com.spacetime.common.mapper.AppUserCancelRemarkMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserCancelRemarkDaoImpl implements AppUserCancelRemarkDao {
    private final AppUserCancelRemarkMapper mapper;

    @Override
    public void insert(AppUserCancelRemark entity) {
        mapper.insert(entity);
    }

    @Override
    public List<AppUserCancelRemark> selectByRequestId(Long requestId) {
        return mapper.selectList(new LambdaQueryWrapper<AppUserCancelRemark>()
                .eq(AppUserCancelRemark::getRequestId, requestId)
                .orderByAsc(AppUserCancelRemark::getCreateTime));
    }
}

package com.spacetime.common.dao;

import com.spacetime.common.entity.AppUserCancelRemark;

import java.util.List;

public interface AppUserCancelRemarkDao {
    void insert(AppUserCancelRemark entity);
    List<AppUserCancelRemark> selectByRequestId(Long requestId);
}

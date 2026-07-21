package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserCancelRequest;

import java.time.LocalDateTime;
import java.util.List;

public interface AppUserCancelRequestDao {
    AppUserCancelRequest selectById(Long id);
    AppUserCancelRequest selectLatestByUserId(Long userId);
    AppUserCancelRequest selectCoolingOffByUserId(Long userId);
    List<AppUserCancelRequest> selectDueCoolingOff(LocalDateTime now, int limit);
    Page<AppUserCancelRequest> selectPage(Page<AppUserCancelRequest> page, LambdaQueryWrapper<AppUserCancelRequest> wrapper);
    void insert(AppUserCancelRequest entity);
    void updateById(AppUserCancelRequest entity);
}

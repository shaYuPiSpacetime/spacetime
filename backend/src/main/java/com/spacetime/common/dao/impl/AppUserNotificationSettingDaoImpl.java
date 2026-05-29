package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserNotificationSettingDao;
import com.spacetime.common.entity.AppUserNotificationSetting;
import com.spacetime.common.mapper.AppUserNotificationSettingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AppUserNotificationSettingDaoImpl implements AppUserNotificationSettingDao {
    private final AppUserNotificationSettingMapper mapper;

    @Override
    public AppUserNotificationSetting selectByUserId(Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppUserNotificationSetting>().eq(AppUserNotificationSetting::getUserId, userId));
    }

    @Override
    public void insert(AppUserNotificationSetting entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserNotificationSetting entity) {
        mapper.updateById(entity);
    }
}

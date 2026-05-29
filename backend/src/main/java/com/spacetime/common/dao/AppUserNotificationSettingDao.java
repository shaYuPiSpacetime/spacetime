package com.spacetime.common.dao;

import com.spacetime.common.entity.AppUserNotificationSetting;

public interface AppUserNotificationSettingDao {
    AppUserNotificationSetting selectByUserId(Long userId);
    void insert(AppUserNotificationSetting entity);
    void updateById(AppUserNotificationSetting entity);
}

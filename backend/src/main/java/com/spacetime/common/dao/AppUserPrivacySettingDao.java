package com.spacetime.common.dao;

import com.spacetime.common.entity.AppUserPrivacySetting;

public interface AppUserPrivacySettingDao {
    AppUserPrivacySetting selectByUserId(Long userId);
    void insert(AppUserPrivacySetting entity);
    void updateById(AppUserPrivacySetting entity);
}

package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserPrivacySettingDao;
import com.spacetime.common.entity.AppUserPrivacySetting;
import com.spacetime.common.mapper.AppUserPrivacySettingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AppUserPrivacySettingDaoImpl implements AppUserPrivacySettingDao {
    private final AppUserPrivacySettingMapper mapper;

    @Override
    public AppUserPrivacySetting selectByUserId(Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppUserPrivacySetting>().eq(AppUserPrivacySetting::getUserId, userId));
    }

    @Override
    public void insert(AppUserPrivacySetting entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserPrivacySetting entity) {
        mapper.updateById(entity);
    }
}

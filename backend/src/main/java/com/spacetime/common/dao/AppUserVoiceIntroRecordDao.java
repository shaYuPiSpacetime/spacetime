package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserVoiceIntroRecord;

import java.util.List;

public interface AppUserVoiceIntroRecordDao {
    AppUserVoiceIntroRecord selectById(Long id);
    AppUserVoiceIntroRecord selectOne(LambdaQueryWrapper<AppUserVoiceIntroRecord> wrapper);
    Page<AppUserVoiceIntroRecord> selectPage(Page<AppUserVoiceIntroRecord> page, LambdaQueryWrapper<AppUserVoiceIntroRecord> wrapper);
    List<AppUserVoiceIntroRecord> selectList(LambdaQueryWrapper<AppUserVoiceIntroRecord> wrapper);
    void insert(AppUserVoiceIntroRecord entity);
    void updateById(AppUserVoiceIntroRecord entity);
}

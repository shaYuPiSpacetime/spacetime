package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserVoiceIntroRecordDao;
import com.spacetime.common.entity.AppUserVoiceIntroRecord;
import com.spacetime.common.mapper.AppUserVoiceIntroRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AppUserVoiceIntroRecordDaoImpl implements AppUserVoiceIntroRecordDao {
    private final AppUserVoiceIntroRecordMapper mapper;

    @Override
    public AppUserVoiceIntroRecord selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserVoiceIntroRecord selectOne(LambdaQueryWrapper<AppUserVoiceIntroRecord> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<AppUserVoiceIntroRecord> selectPage(Page<AppUserVoiceIntroRecord> page, LambdaQueryWrapper<AppUserVoiceIntroRecord> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserVoiceIntroRecord> selectList(LambdaQueryWrapper<AppUserVoiceIntroRecord> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserVoiceIntroRecord entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserVoiceIntroRecord entity) {
        mapper.updateById(entity);
    }
}

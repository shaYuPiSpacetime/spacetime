package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserFeedbackDao;
import com.spacetime.common.entity.AppUserFeedback;
import com.spacetime.common.mapper.AppUserFeedbackMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AppUserFeedbackDaoImpl implements AppUserFeedbackDao {
    private final AppUserFeedbackMapper mapper;

    @Override
    public AppUserFeedback selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<AppUserFeedback> selectPage(Page<AppUserFeedback> page, LambdaQueryWrapper<AppUserFeedback> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public long countByUserId(Long userId) {
        return mapper.selectCount(new LambdaQueryWrapper<AppUserFeedback>().eq(AppUserFeedback::getUserId, userId));
    }

    @Override
    public void insert(AppUserFeedback entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserFeedback entity) {
        mapper.updateById(entity);
    }
}

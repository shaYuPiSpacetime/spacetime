package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserFeedback;

public interface AppUserFeedbackDao {
    AppUserFeedback selectById(Long id);
    Page<AppUserFeedback> selectPage(Page<AppUserFeedback> page, LambdaQueryWrapper<AppUserFeedback> wrapper);
    long countByUserId(Long userId);
    void insert(AppUserFeedback entity);
    void updateById(AppUserFeedback entity);
}

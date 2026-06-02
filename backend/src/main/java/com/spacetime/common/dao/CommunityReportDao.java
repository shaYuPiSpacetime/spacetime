package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.CommunityReport;

import java.util.List;

public interface CommunityReportDao {
    CommunityReport selectById(Long id);
    Page<CommunityReport> selectPage(Page<CommunityReport> page, LambdaQueryWrapper<CommunityReport> wrapper);
    List<CommunityReport> selectList(LambdaQueryWrapper<CommunityReport> wrapper);
    void insert(CommunityReport entity);
    void updateById(CommunityReport entity);
}

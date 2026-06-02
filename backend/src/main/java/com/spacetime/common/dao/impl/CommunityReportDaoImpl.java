package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CommunityReportDao;
import com.spacetime.common.entity.CommunityReport;
import com.spacetime.common.mapper.CommunityReportMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class CommunityReportDaoImpl implements CommunityReportDao {
    private final CommunityReportMapper mapper;

    @Override
    public CommunityReport selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<CommunityReport> selectPage(Page<CommunityReport> page, LambdaQueryWrapper<CommunityReport> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<CommunityReport> selectList(LambdaQueryWrapper<CommunityReport> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(CommunityReport entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(CommunityReport entity) {
        mapper.updateById(entity);
    }
}

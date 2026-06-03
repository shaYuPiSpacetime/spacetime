package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CommunityPostDao;
import com.spacetime.common.entity.CommunityPost;
import com.spacetime.common.mapper.CommunityPostMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 社区内容数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class CommunityPostDaoImpl implements CommunityPostDao {
    private final CommunityPostMapper mapper;

    @Override
    public CommunityPost selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<CommunityPost> selectPage(Page<CommunityPost> page, LambdaQueryWrapper<CommunityPost> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<CommunityPost> selectList(LambdaQueryWrapper<CommunityPost> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(CommunityPost entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(CommunityPost entity) {
        mapper.updateById(entity);
    }
}

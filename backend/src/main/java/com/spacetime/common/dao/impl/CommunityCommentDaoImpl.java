package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CommunityCommentDao;
import com.spacetime.common.entity.CommunityComment;
import com.spacetime.common.mapper.CommunityCommentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 社区评论数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class CommunityCommentDaoImpl implements CommunityCommentDao {
    /** 社区评论 MyBatis Mapper */
    private final CommunityCommentMapper mapper;

    @Override
    public CommunityComment selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<CommunityComment> selectPage(Page<CommunityComment> page, LambdaQueryWrapper<CommunityComment> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<CommunityComment> selectList(LambdaQueryWrapper<CommunityComment> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(CommunityComment entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(CommunityComment entity) {
        mapper.updateById(entity);
    }
}

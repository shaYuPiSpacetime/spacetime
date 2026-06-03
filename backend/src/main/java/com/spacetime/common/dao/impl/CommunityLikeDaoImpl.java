package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.CommunityLikeDao;
import com.spacetime.common.entity.CommunityLike;
import com.spacetime.common.mapper.CommunityLikeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 社区点赞数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class CommunityLikeDaoImpl implements CommunityLikeDao {
    private final CommunityLikeMapper mapper;

    @Override
    public CommunityLike selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public CommunityLike selectOne(LambdaQueryWrapper<CommunityLike> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public List<CommunityLike> selectList(LambdaQueryWrapper<CommunityLike> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(CommunityLike entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(CommunityLike entity) {
        mapper.updateById(entity);
    }
}

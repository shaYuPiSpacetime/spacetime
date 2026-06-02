package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.CommunityFollowDao;
import com.spacetime.common.entity.CommunityFollow;
import com.spacetime.common.mapper.CommunityFollowMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class CommunityFollowDaoImpl implements CommunityFollowDao {
    private final CommunityFollowMapper mapper;

    @Override
    public CommunityFollow selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public CommunityFollow selectOne(LambdaQueryWrapper<CommunityFollow> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public List<CommunityFollow> selectList(LambdaQueryWrapper<CommunityFollow> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(CommunityFollow entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(CommunityFollow entity) {
        mapper.updateById(entity);
    }
}

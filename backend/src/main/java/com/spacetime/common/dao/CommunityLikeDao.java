package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.entity.CommunityLike;

import java.util.List;

public interface CommunityLikeDao {
    CommunityLike selectById(Long id);
    CommunityLike selectOne(LambdaQueryWrapper<CommunityLike> wrapper);
    List<CommunityLike> selectList(LambdaQueryWrapper<CommunityLike> wrapper);
    void insert(CommunityLike entity);
    void updateById(CommunityLike entity);
}

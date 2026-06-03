package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.entity.CommunityLike;

import java.util.List;

/**
 * 社区点赞数据访问接口
 */
public interface CommunityLikeDao {
    CommunityLike selectById(Long id);
    CommunityLike selectOne(LambdaQueryWrapper<CommunityLike> wrapper);
    List<CommunityLike> selectList(LambdaQueryWrapper<CommunityLike> wrapper);
    void insert(CommunityLike entity);
    void updateById(CommunityLike entity);
}

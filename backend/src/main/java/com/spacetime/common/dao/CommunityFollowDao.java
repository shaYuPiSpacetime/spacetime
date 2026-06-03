package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.entity.CommunityFollow;

import java.util.List;

/**
 * 社区关注数据访问接口
 */
public interface CommunityFollowDao {
    CommunityFollow selectById(Long id);
    CommunityFollow selectOne(LambdaQueryWrapper<CommunityFollow> wrapper);
    List<CommunityFollow> selectList(LambdaQueryWrapper<CommunityFollow> wrapper);
    void insert(CommunityFollow entity);
    void updateById(CommunityFollow entity);
}

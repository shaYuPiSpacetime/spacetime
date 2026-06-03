package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.CommunityPost;

import java.util.List;

/**
 * 社区内容数据访问接口
 */
public interface CommunityPostDao {
    CommunityPost selectById(Long id);
    Page<CommunityPost> selectPage(Page<CommunityPost> page, LambdaQueryWrapper<CommunityPost> wrapper);
    List<CommunityPost> selectList(LambdaQueryWrapper<CommunityPost> wrapper);
    void insert(CommunityPost entity);
    void updateById(CommunityPost entity);
}

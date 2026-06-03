package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.CommunityComment;

import java.util.List;

/**
 * 社区评论数据访问接口
 */
public interface CommunityCommentDao {
    CommunityComment selectById(Long id);
    Page<CommunityComment> selectPage(Page<CommunityComment> page, LambdaQueryWrapper<CommunityComment> wrapper);
    List<CommunityComment> selectList(LambdaQueryWrapper<CommunityComment> wrapper);
    void insert(CommunityComment entity);
    void updateById(CommunityComment entity);
}

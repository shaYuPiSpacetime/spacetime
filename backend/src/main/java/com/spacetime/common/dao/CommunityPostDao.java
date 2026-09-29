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
    /** 当前读并锁定帖子，用于审核/删除竞态后获取最新版本。 */
    CommunityPost selectByIdForUpdate(Long id);
    Page<CommunityPost> selectPage(Page<CommunityPost> page, LambdaQueryWrapper<CommunityPost> wrapper);
    List<CommunityPost> selectList(LambdaQueryWrapper<CommunityPost> wrapper);
    void insert(CommunityPost entity);
    void updateById(CommunityPost entity);
    int updateCas(CommunityPost entity, int expectedVersion);
    /** 仅当帖子仍为驳回态且版本一致时，抢占一次重新提交。 */
    int claimRejectedForResubmit(Long id, int expectedVersion);
}

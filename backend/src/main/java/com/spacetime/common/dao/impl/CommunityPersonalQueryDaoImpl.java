package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CommunityPersonalQueryDao;
import com.spacetime.common.mapper.CommunityPersonalQueryMapper;
import com.spacetime.common.model.community.CommunityInteractionProjection;
import com.spacetime.common.model.community.CommunityPersonalStats;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 社区个人区查询实现。 */
@Repository
@RequiredArgsConstructor
public class CommunityPersonalQueryDaoImpl implements CommunityPersonalQueryDao {
    /** 个人区只读查询 Mapper。 */
    private final CommunityPersonalQueryMapper mapper;

    @Override
    public CommunityPersonalStats selectStats(Long userId) {
        return mapper.selectStats(userId);
    }

    @Override
    public long countFollowing(Long userId) {
        return mapper.countFollowing(userId);
    }

    @Override
    public Page<CommunityInteractionProjection> selectInteractions(Page<CommunityInteractionProjection> page, Long userId, String type) {
        // JOIN 参与可见性过滤，不允许分页插件优化 COUNT 时移除 JOIN。
        page.setOptimizeJoinOfCountSql(false);
        return mapper.selectInteractions(page, userId, type);
    }

    @Override
    public Page<CommunityInteractionProjection> selectInteractors(Page<CommunityInteractionProjection> page, Long postId, String type) {
        page.setOptimizeJoinOfCountSql(false);
        return mapper.selectInteractors(page, postId, type);
    }

    @Override
    public Page<CommunityInteractionProjection> selectHiddenAuthors(Page<CommunityInteractionProjection> page, Long userId) {
        page.setOptimizeJoinOfCountSql(false);
        return mapper.selectHiddenAuthors(page, userId);
    }
}

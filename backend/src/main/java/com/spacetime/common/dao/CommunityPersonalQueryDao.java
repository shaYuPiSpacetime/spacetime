package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.model.community.CommunityInteractionProjection;
import com.spacetime.common.model.community.CommunityPersonalStats;

/** 社区个人区聚合与分页查询。 */
public interface CommunityPersonalQueryDao {
    /** 实时聚合个人统计。 */
    CommunityPersonalStats selectStats(Long userId);
    /** 关注数轻量查询，不加载关注关系正文。 */
    long countFollowing(Long userId);
    /** 仅查询当前页，父动态可见性在分页前过滤。 */
    Page<CommunityInteractionProjection> selectInteractions(Page<CommunityInteractionProjection> page, Long userId, String type);
    /** 分页查询点赞/评论用户，重复评论合并为最新一次。 */
    Page<CommunityInteractionProjection> selectInteractors(Page<CommunityInteractionProjection> page, Long postId, String type);
    /** 分页查询本人隐藏的有效用户。 */
    Page<CommunityInteractionProjection> selectHiddenAuthors(Page<CommunityInteractionProjection> page, Long userId);
}

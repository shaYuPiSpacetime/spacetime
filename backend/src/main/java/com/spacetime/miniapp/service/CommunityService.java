package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.miniapp.dto.request.CommunityCommentCreateReq;
import com.spacetime.miniapp.dto.request.CommunityPostCreateReq;
import com.spacetime.miniapp.dto.request.CommunityReportCreateReq;
import com.spacetime.miniapp.dto.response.*;

/**
 * 小程序社区服务
 */
public interface CommunityService {
    Page<CommunityPostCardVO> getPosts(Long userId, String postType, Long topicId, int page, int size);
    CommunityPostDetailVO getPostDetail(Long userId, Long postId);
    Long createPost(Long userId, CommunityPostCreateReq req);
    void deletePost(Long userId, Long postId);
    Page<CommunityCommentVO> getComments(Long userId, Long postId, int page, int size);
    Long createComment(Long userId, CommunityCommentCreateReq req);
    void deleteComment(Long userId, Long commentId);
    CommunityLikeToggleVO toggleLike(Long userId, Long postId);
    CommunityFollowToggleVO toggleFollow(Long userId, Long targetUserId);
    Long createReport(Long userId, CommunityReportCreateReq req);
    CommunityConfigVO getConfig();
}

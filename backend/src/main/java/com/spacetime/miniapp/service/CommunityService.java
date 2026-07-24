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

    /** 查询千寻热门页话题聚合。 */
    CommunityTopicHomeVO getTopicHome(Long userId);

    /** 分页查询社区话题。 */
    Page<CommunityTopicCardVO> getTopics(int page, int size);

    /** 查询社区话题详情。 */
    CommunityTopicDetailVO getTopicDetail(Long topicId);

    /** 分页查询话题动态，sort 支持 HOT、LATEST。 */
    Page<CommunityPostCardVO> getTopicPosts(Long userId, Long topicId, String sort, int page, int size);

    /**
     * 分页查询社区内容列表
     *
     * @param userId   当前用户ID（可选，用于判断点赞/关注状态）
     * @param postType 内容类型（可选）
     * @param topicId  话题ID（可选）
     * @param page     页码
     * @param size     每页条数
     * @return 内容卡片分页列表
     */
    Page<CommunityPostCardVO> getPosts(Long userId, String postType, Long topicId, String scene, int page, int size);

    /**
     * 查询内容详情
     *
     * @param userId 当前用户ID（可选）
     * @param postId 内容ID
     * @return 内容详情（含作者信息、点赞/关注状态）
     */
    CommunityPostDetailVO getPostDetail(Long userId, Long postId);

    /**
     * 发布社区内容
     *
     * @param userId 当前用户ID
     * @param req    内容发布请求
     * @return 新内容ID
     */
    Long createPost(Long userId, CommunityPostCreateReq req);

    /**
     * 删除自己的社区内容（软删除）
     *
     * @param userId 当前用户ID
     * @param postId 内容ID
     */
    void deletePost(Long userId, Long postId);

    /**
     * 分页查询内容的评论列表
     *
     * @param userId 当前用户ID（可选）
     * @param postId 内容ID
     * @param page   页码
     * @param size   每页条数
     * @return 评论分页列表
     */
    Page<CommunityCommentVO> getComments(Long userId, Long postId, int page, int size);

    /**
     * 发表评论
     *
     * @param userId 当前用户ID
     * @param req    评论请求
     * @return 新评论ID
     */
    Long createComment(Long userId, CommunityCommentCreateReq req);

    /**
     * 删除自己的评论（软删除）
     *
     * @param userId    当前用户ID
     * @param commentId 评论ID
     */
    void deleteComment(Long userId, Long commentId);

    /**
     * 点赞/取消点赞内容（三态切换）
     *
     * @param userId 当前用户ID
     * @param postId 内容ID
     * @return 点赞切换结果（是否已赞、当前点赞数）
     */
    CommunityLikeToggleVO toggleLike(Long userId, Long postId);

    /**
     * 关注/取消关注用户
     *
     * @param userId       当前用户ID
     * @param targetUserId 目标用户ID
     * @return 关注切换结果（是否已关注）
     */
    CommunityFollowToggleVO toggleFollow(Long userId, Long targetUserId);

    /** 查询悦目用户照片发现列表。 */
    Page<YuemuUserCardVO> getYuemuUsers(Long userId, int page, int size);

    /** 切换悦目用户心动态。 */
    YuemuLikeToggleVO toggleYuemuLike(Long userId, Long targetUserId);

    /** 当前用户有效关注人数。 */
    long countFollowing(Long userId);

    /**
     * 提交举报
     *
     * @param userId 举报人ID
     * @param req    举报请求
     * @return 新举报ID
     */
    Long createReport(Long userId, CommunityReportCreateReq req);

    /**
     * 获取社区公共配置
     *
     * @return 社区配置（交互门槛、发布限制、首页标签等）
     */
    CommunityConfigVO getConfig();
}

package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.CommunityCommentCreateReq;
import com.spacetime.miniapp.dto.request.CommunityPostCreateReq;
import com.spacetime.miniapp.dto.request.CommunityReportCreateReq;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序社区控制器
 */
@Slf4j
@RestController
@RequestMapping("/miniapp/community")
@RequiredArgsConstructor
public class CommunityController {

    /** 社区服务 */
    private final CommunityService communityService;

    /**
     * 分页查询社区内容列表
     *
     * @param postType 内容类型（可选）：诚意贴/普通动态
     * @param topicId  话题ID（可选）
     * @param page     页码，默认1
     * @param size     每页条数，默认10
     * @return 内容卡片分页列表
     */
    @GetMapping("/posts")
    public R<Page<CommunityPostCardVO>> posts(@RequestParam(required = false) String postType,
                                              @RequestParam(required = false) Long topicId,
                                              @RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getPosts(optionalCurrentUserId(), postType, topicId, page, size));
    }

    /**
     * 查询内容详情
     *
     * @param id 内容ID
     * @return 内容详情（含作者信息、点赞/关注状态）
     */
    @GetMapping("/posts/{id}")
    public R<CommunityPostDetailVO> detail(@PathVariable Long id) {
        return R.ok(communityService.getPostDetail(optionalCurrentUserId(), id));
    }

    /**
     * 发布社区内容
     *
     * @param req 内容发布请求（类型/标题/正文/图片/话题/@用户）
     * @return 新内容ID
     */
    @PostMapping("/posts")
    public R<Long> createPost(@Valid @RequestBody CommunityPostCreateReq req) {
        Long userId = currentUserId();
        log.info("发布内容: userId={}, postType={}", userId, req.getPostType());
        return R.ok(communityService.createPost(userId, req));
    }

    /**
     * 删除自己的社区内容（软删除）
     *
     * @param id 内容ID
     * @return 空响应
     */
    @DeleteMapping("/posts/{id}")
    public R<Void> deletePost(@PathVariable Long id) {
        Long userId = currentUserId();
        log.info("删除内容: userId={}, postId={}", userId, id);
        communityService.deletePost(userId, id);
        return R.ok();
    }

    /**
     * 分页查询内容的评论列表
     *
     * @param id   内容ID
     * @param page 页码，默认1
     * @param size 每页条数，默认10
     * @return 评论分页列表
     */
    @GetMapping("/posts/{id}/comments")
    public R<Page<CommunityCommentVO>> comments(@PathVariable Long id,
                                                @RequestParam(defaultValue = "1") int page,
                                                @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getComments(optionalCurrentUserId(), id, page, size));
    }

    /**
     * 发表评论
     *
     * @param req 评论请求（内容ID/父评论ID/被回复用户ID/评论正文）
     * @return 新评论ID
     */
    @PostMapping("/comments")
    public R<Long> createComment(@Valid @RequestBody CommunityCommentCreateReq req) {
        Long userId = currentUserId();
        log.info("发表评论: userId={}, postId={}", userId, req.getPostId());
        return R.ok(communityService.createComment(userId, req));
    }

    /**
     * 删除自己的评论（软删除）
     *
     * @param id 评论ID
     * @return 空响应
     */
    @DeleteMapping("/comments/{id}")
    public R<Void> deleteComment(@PathVariable Long id) {
        Long userId = currentUserId();
        log.info("删除评论: userId={}, commentId={}", userId, id);
        communityService.deleteComment(userId, id);
        return R.ok();
    }

    /**
     * 点赞/取消点赞内容
     *
     * @param id 内容ID
     * @return 点赞切换结果（是否已赞、当前点赞数）
     */
    @PostMapping("/posts/{id}/like")
    public R<CommunityLikeToggleVO> toggleLike(@PathVariable Long id) {
        Long userId = currentUserId();
        log.info("点赞切换: userId={}, postId={}", userId, id);
        return R.ok(communityService.toggleLike(userId, id));
    }

    /**
     * 关注/取消关注用户
     *
     * @param targetUserId 目标用户ID
     * @return 关注切换结果（当前是否已关注）
     */
    @PostMapping("/follows/{targetUserId}")
    public R<CommunityFollowToggleVO> toggleFollow(@PathVariable Long targetUserId) {
        Long userId = currentUserId();
        log.info("关注切换: userId={}, targetUserId={}", userId, targetUserId);
        return R.ok(communityService.toggleFollow(userId, targetUserId));
    }

    /**
     * 提交举报
     *
     * @param req 举报请求（目标类型/目标ID/举报原因/补充说明）
     * @return 新举报ID
     */
    @PostMapping("/reports")
    public R<Long> createReport(@Valid @RequestBody CommunityReportCreateReq req) {
        Long userId = currentUserId();
        log.info("提交举报: userId={}, targetType={}, targetId={}", userId, req.getTargetType(), req.getTargetId());
        return R.ok(communityService.createReport(userId, req));
    }

    /**
     * 获取社区公共配置
     *
     * @return 社区配置（交互门槛/发布限制/首页标签）
     */
    @GetMapping("/config")
    public R<CommunityConfigVO> config() {
        return R.ok(communityService.getConfig());
    }

    /**
     * 从上下文中获取当前登录用户ID，未登录抛出异常
     *
     * @return 当前用户ID
     */
    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }

    /**
     * 从上下文中获取当前用户ID（可选，未登录返回null）
     *
     * @return 当前用户ID，未登录时为null
     */
    private Long optionalCurrentUserId() {
        UserContext ctx = UserContextHolder.get();
        return ctx == null ? null : ctx.getId();
    }
}

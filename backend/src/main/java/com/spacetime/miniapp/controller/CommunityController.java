package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.CommunityCommentCreateReq;
import com.spacetime.miniapp.dto.request.CommunityDraftSaveReq;
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

    /** 查询千寻热门页话题聚合。 */
    @GetMapping("/topics/home")
    public R<CommunityTopicHomeVO> topicHome() {
        return R.ok(communityService.getTopicHome(optionalCurrentUserId()));
    }

    /** 分页查询社区话题。 */
    @GetMapping("/topics")
    public R<Page<CommunityTopicCardVO>> topics(@RequestParam(defaultValue = "1") int page,
                                                @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getTopics(page, size));
    }

    /** 查询社区话题详情。 */
    @GetMapping("/topics/{id}")
    public R<CommunityTopicDetailVO> topicDetail(@PathVariable Long id) {
        return R.ok(communityService.getTopicDetail(id));
    }

    /** 分页查询话题动态。 */
    @GetMapping("/topics/{id}/posts")
    public R<Page<CommunityPostCardVO>> topicPosts(@PathVariable Long id,
                                                   @RequestParam(defaultValue = "HOT") String sort,
                                                   @RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getTopicPosts(optionalCurrentUserId(), id, sort, page, size));
    }

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
                                              @RequestParam(required = false) String scene,
                                              @RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getPosts(optionalCurrentUserId(), postType, topicId, scene, page, size));
    }

    /** 查询知音悦目用户照片发现列表。 */
    @GetMapping("/yuemu")
    public R<Page<YuemuUserCardVO>> yuemu(@RequestParam(defaultValue = "1") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        return R.ok(communityService.getYuemuUsers(currentUserId(), page, size));
    }

    /** 切换悦目用户心动态。 */
    @PostMapping("/yuemu/{targetUserId}/like")
    public R<YuemuLikeToggleVO> toggleYuemuLike(@PathVariable Long targetUserId) {
        return R.ok(communityService.toggleYuemuLike(currentUserId(), targetUserId));
    }

    /** 查询诚意贴列表，避免客户端错误复用热门动态。 */
    @GetMapping("/sincere-posts")
    public R<Page<CommunityPostCardVO>> sincerePosts(@RequestParam(defaultValue = "1") int page,
                                                     @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getPosts(optionalCurrentUserId(), "sincere_post", null, null, page, size));
    }

    /**
     * 查询内容详情
     *
     * @param id 内容ID
     * @return 内容详情（含作者信息、点赞/关注状态）
     */
    @GetMapping("/posts/{id}")
    public R<CommunityPostDetailVO> detail(@PathVariable String id) {
        return R.ok(communityService.getPostDetail(optionalCurrentUserId(), id));
    }

    /**
     * 发布社区内容
     *
     * @param req 内容发布请求（类型/标题/正文/图片/话题/@用户）
     * @return 新内容ID
     */
    @PostMapping("/posts")
    public R<CommunityPublishResultVO> createPost(@Valid @RequestBody CommunityPostCreateReq req) {
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
    public R<Void> deletePost(@PathVariable String id) {
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
    public R<Page<CommunityCommentVO>> comments(@PathVariable String id,
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
    public R<CommunityCommentResultVO> createComment(@Valid @RequestBody CommunityCommentCreateReq req) {
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
    public R<Void> deleteComment(@PathVariable String id) {
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
    public R<CommunityLikeToggleVO> toggleLike(@PathVariable String id) {
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

    @GetMapping("/following/count")
    public R<Long> followingCount() {
        return R.ok(communityService.countFollowing(currentUserId()));
    }

    /**
     * 提交举报
     *
     * @param req 举报请求（目标类型/目标ID/举报原因/补充说明）
     * @return 新举报ID
     */
    @PostMapping("/reports")
    public R<CommunityReportResultVO> createReport(@Valid @RequestBody CommunityReportCreateReq req) {
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

    @GetMapping("/meta")
    public R<CommunityMetaVO> meta() {
        return R.ok(communityService.getMeta());
    }

    @GetMapping("/drafts/{contentType}")
    public R<CommunityDraftVO> draft(@PathVariable String contentType) {
        return R.ok(communityService.getDraft(currentUserId(), contentType));
    }

    @PutMapping("/drafts/{contentType}")
    public R<CommunityDraftVO> saveDraft(@PathVariable String contentType,
                                         @RequestBody CommunityDraftSaveReq req) {
        return R.ok(communityService.saveDraft(currentUserId(), contentType, req));
    }

    @DeleteMapping("/drafts/{contentType}")
    public R<Void> deleteDraft(@PathVariable String contentType) {
        communityService.deleteDraft(currentUserId(), contentType);
        return R.ok();
    }

    @GetMapping("/me/posts")
    public R<Page<CommunityPostCardVO>> myPosts(@RequestParam(defaultValue = "1") int page,
                                                 @RequestParam(defaultValue = "10") int size) {
        Long userId = currentUserId();
        return R.ok(communityService.getUserPosts(userId, String.valueOf(userId), true, page, size));
    }

    @GetMapping("/users/{userId}/posts")
    public R<Page<CommunityPostCardVO>> userPosts(@PathVariable String userId,
                                                   @RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getUserPosts(optionalCurrentUserId(), userId, false, page, size));
    }

    @GetMapping("/me/interactions")
    public R<Page<CommunityInteractionRecordVO>> interactions(@RequestParam(defaultValue = "viewed") String type,
                                                      @RequestParam(defaultValue = "1") int page,
                                                      @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getInteractionHistory(currentUserId(), type, page, size));
    }

    @GetMapping("/me/view-history")
    public R<Page<CommunityPostCardVO>> viewHistory(@RequestParam(defaultValue = "1") int page,
                                                     @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getViewHistory(currentUserId(), page, size));
    }

    @DeleteMapping("/me/view-history")
    public R<Void> clearViewHistory() {
        communityService.clearViewHistory(currentUserId());
        return R.ok();
    }

    @GetMapping("/me/follows")
    public R<Page<CommunityRelationUserVO>> relations(@RequestParam(defaultValue = "following") String relation,
                                                       @RequestParam(defaultValue = "1") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        return R.ok(communityService.getRelations(currentUserId(), relation, page, size));
    }

    @GetMapping("/posts/{id}/interactors")
    public R<Page<CommunityRelationUserVO>> interactors(@PathVariable String id,
                                                         @RequestParam String type,
                                                         @RequestParam(defaultValue = "1") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        return R.ok(communityService.getPostInteractors(optionalCurrentUserId(), id, type, page, size));
    }

    @GetMapping("/me/hidden-authors")
    public R<Page<CommunityRelationUserVO>> hiddenAuthors(@RequestParam(defaultValue = "1") int page,
                                                           @RequestParam(defaultValue = "20") int size) {
        return R.ok(communityService.getHiddenAuthors(currentUserId(), page, size));
    }

    @PutMapping("/me/hidden-authors/{targetUserId}")
    public R<CommunityAuthorPreferenceResultVO> hideAuthor(@PathVariable String targetUserId) {
        return R.ok(communityService.hideAuthor(currentUserId(), targetUserId));
    }

    @DeleteMapping("/me/hidden-authors/{targetUserId}")
    public R<CommunityAuthorPreferenceResultVO> unhideAuthor(@PathVariable String targetUserId) {
        return R.ok(communityService.unhideAuthor(currentUserId(), targetUserId));
    }

    @GetMapping("/me/profile-summary")
    public R<CommunityProfileSummaryVO> profileSummary() {
        return R.ok(communityService.getProfileSummary(currentUserId()));
    }

    @PostMapping("/posts/{id}/view")
    public R<Void> recordView(@PathVariable String id) {
        communityService.recordView(currentUserId(), id);
        return R.ok();
    }

    @PostMapping("/comments/{id}/like")
    public R<CommunityLikeToggleVO> toggleCommentLike(@PathVariable String id) {
        return R.ok(communityService.toggleCommentLike(currentUserId(), id));
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

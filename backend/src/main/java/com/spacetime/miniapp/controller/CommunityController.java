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
import org.springframework.web.bind.annotation.*;

/**
 * 小程序社区控制器
 */
@RestController
@RequestMapping("/miniapp/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping("/posts")
    public R<Page<CommunityPostCardVO>> posts(@RequestParam(required = false) String postType,
                                              @RequestParam(required = false) Long topicId,
                                              @RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getPosts(optionalCurrentUserId(), postType, topicId, page, size));
    }

    @GetMapping("/posts/{id}")
    public R<CommunityPostDetailVO> detail(@PathVariable Long id) {
        return R.ok(communityService.getPostDetail(optionalCurrentUserId(), id));
    }

    @PostMapping("/posts")
    public R<Long> createPost(@Valid @RequestBody CommunityPostCreateReq req) {
        return R.ok(communityService.createPost(currentUserId(), req));
    }

    @DeleteMapping("/posts/{id}")
    public R<Void> deletePost(@PathVariable Long id) {
        communityService.deletePost(currentUserId(), id);
        return R.ok();
    }

    @GetMapping("/posts/{id}/comments")
    public R<Page<CommunityCommentVO>> comments(@PathVariable Long id,
                                                @RequestParam(defaultValue = "1") int page,
                                                @RequestParam(defaultValue = "10") int size) {
        return R.ok(communityService.getComments(optionalCurrentUserId(), id, page, size));
    }

    @PostMapping("/comments")
    public R<Long> createComment(@Valid @RequestBody CommunityCommentCreateReq req) {
        return R.ok(communityService.createComment(currentUserId(), req));
    }

    @DeleteMapping("/comments/{id}")
    public R<Void> deleteComment(@PathVariable Long id) {
        communityService.deleteComment(currentUserId(), id);
        return R.ok();
    }

    @PostMapping("/posts/{id}/like")
    public R<CommunityLikeToggleVO> toggleLike(@PathVariable Long id) {
        return R.ok(communityService.toggleLike(currentUserId(), id));
    }

    @PostMapping("/follows/{targetUserId}")
    public R<CommunityFollowToggleVO> toggleFollow(@PathVariable Long targetUserId) {
        return R.ok(communityService.toggleFollow(currentUserId(), targetUserId));
    }

    @PostMapping("/reports")
    public R<Long> createReport(@Valid @RequestBody CommunityReportCreateReq req) {
        return R.ok(communityService.createReport(currentUserId(), req));
    }

    @GetMapping("/config")
    public R<CommunityConfigVO> config() {
        return R.ok(communityService.getConfig());
    }

    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }

    private Long optionalCurrentUserId() {
        UserContext ctx = UserContextHolder.get();
        return ctx == null ? null : ctx.getId();
    }
}

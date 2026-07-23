package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.MatchPopupReadReq;
import com.spacetime.miniapp.dto.request.LikesMeReadReq;
import com.spacetime.miniapp.dto.request.RelationLikeCreateReq;
import com.spacetime.miniapp.dto.request.RelationVisitCreateReq;
import com.spacetime.miniapp.dto.response.LikesMePageVO;
import com.spacetime.miniapp.dto.response.MatchPopupVO;
import com.spacetime.miniapp.dto.response.MutualMatchPageVO;
import com.spacetime.miniapp.dto.response.RecentViewersPageVO;
import com.spacetime.miniapp.dto.response.RelationLikeActionVO;
import com.spacetime.miniapp.dto.response.RelationVisitActionVO;
import com.spacetime.miniapp.service.MiniappRelationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** PRD-02 移动端关系反馈接口。 */
@RestController
@RequestMapping("/miniapp/relation")
@RequiredArgsConstructor
public class MiniappRelationController {
    private final MiniappRelationService relationService;

    @GetMapping("/likes-me")
    public R<LikesMePageVO> likesMe(@RequestParam(defaultValue = "1") int page,
                                    @RequestParam(defaultValue = "20") int size,
                                    @RequestParam(required = false) String snapshotCursor) {
        return R.ok(relationService.likesMe(currentUserId(), page, size, snapshotCursor));
    }

    @PostMapping("/likes-me/read")
    public R<Void> confirmLikesMeRead(@Valid @RequestBody LikesMeReadReq req) {
        relationService.confirmLikesMeRead(currentUserId(), req);
        return R.ok();
    }

    @GetMapping("/recent-viewers")
    public R<RecentViewersPageVO> recentViewers(@RequestParam(defaultValue = "1") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return R.ok(relationService.recentViewers(currentUserId(), page, size));
    }

    @GetMapping("/mutual-matches")
    public R<MutualMatchPageVO> mutualMatches(@RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return R.ok(relationService.mutualMatches(currentUserId(), page, size));
    }

    @PostMapping("/likes")
    public R<RelationLikeActionVO> createLike(@Valid @RequestBody RelationLikeCreateReq req) {
        return R.ok(relationService.createLike(currentUserId(), req));
    }

    @DeleteMapping("/likes/{targetUserId}")
    public R<RelationLikeActionVO> cancelLike(@PathVariable Long targetUserId) {
        return R.ok(relationService.cancelLike(currentUserId(), targetUserId));
    }

    @PostMapping("/visits")
    public R<RelationVisitActionVO> recordVisit(@Valid @RequestBody RelationVisitCreateReq req) {
        return R.ok(relationService.recordVisit(currentUserId(), req));
    }

    @GetMapping("/match-popup/pending")
    public R<MatchPopupVO> pendingPopup() {
        return R.ok(relationService.pendingPopup(currentUserId()));
    }

    @PostMapping("/match-popup/{matchNo}/read")
    public R<Void> readPopup(@PathVariable String matchNo,
                             @Valid @RequestBody MatchPopupReadReq req) {
        relationService.readPopup(currentUserId(), matchNo, req);
        return R.ok();
    }

    private Long currentUserId() {
        UserContext context = UserContextHolder.get();
        if (context == null || context.getId() == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return context.getId();
    }
}

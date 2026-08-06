package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.RecommendPreferenceSaveReq;
import com.spacetime.miniapp.dto.request.RecommendViewActionReq;
import com.spacetime.miniapp.dto.response.RecommendCandidatePageVO;
import com.spacetime.miniapp.dto.response.RecommendPreferenceVO;
import com.spacetime.miniapp.dto.response.RecommendReplayPageVO;
import com.spacetime.miniapp.service.RecommendService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** PRD-08 小程序推荐接口。 */
@RestController
@RequestMapping("/miniapp/recommend")
@RequiredArgsConstructor
public class RecommendController {
    private final RecommendService recommendService;

    /** 查询已保存偏好，未保存时返回不落库的智能默认值。 */
    @GetMapping("/preferences")
    public R<RecommendPreferenceVO> preferences() {
        return R.ok(recommendService.getPreferences(currentUserId()));
    }

    /** 通过版本号乐观锁保存推荐偏好。 */
    @PutMapping("/preferences")
    public R<RecommendPreferenceVO> savePreferences(
            @Valid @RequestBody RecommendPreferenceSaveReq req) {
        return R.ok(recommendService.savePreferences(currentUserId(), req));
    }

    /** 游标查询当前用户可见的推荐候选。 */
    @GetMapping("/candidates")
    public R<RecommendCandidatePageVO> candidates(
            @RequestParam(required = false) String cursor) {
        return R.ok(recommendService.getCandidates(currentUserId(), cursor));
    }

    /** 候选进入有效可见区后确认曝光。 */
    @PostMapping("/candidates/{candidateNo}/view")
    public R<Void> view(@PathVariable String candidateNo,
                        @Valid @RequestBody RecommendViewActionReq req) {
        return recordAction(candidateNo, "view", req);
    }

    /** 跳过当前候选。 */
    @PostMapping("/candidates/{candidateNo}/skip")
    public R<Void> skip(@PathVariable String candidateNo,
                        @Valid @RequestBody RecommendViewActionReq req) {
        return recordAction(candidateNo, "skip", req);
    }

    /** 从推荐或三天回看发起喜欢后记录推荐动作。 */
    @PostMapping("/candidates/{candidateNo}/like")
    public R<Void> like(@PathVariable String candidateNo,
                        @Valid @RequestBody RecommendViewActionReq req) {
        return recordAction(candidateNo, "like", req);
    }

    /** 将候选加入“不再推荐”，后续推荐和理想型统一排除。 */
    @PostMapping("/candidates/{candidateNo}/never")
    public R<Void> never(@PathVariable String candidateNo,
                         @Valid @RequestBody RecommendViewActionReq req) {
        return recordAction(candidateNo, "never", req);
    }

    /** 查询最近三天去重后的推荐回看。 */
    @GetMapping("/replay")
    public R<RecommendReplayPageVO> replay() {
        return R.ok(recommendService.getReplay(currentUserId()));
    }

    private R<Void> recordAction(String candidateNo,
                                 String action,
                                 RecommendViewActionReq req) {
        recommendService.recordAction(currentUserId(), candidateNo, action, req);
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

package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.MeetingPreferenceSaveReq;
import com.spacetime.miniapp.dto.response.MeetingPreferenceVO;
import com.spacetime.miniapp.service.MeetingPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** PRD-08 见面偏好接口。 */
@RestController
@RequestMapping("/miniapp/recommend/meeting-preference")
@RequiredArgsConstructor
public class MeetingPreferenceController {
    private final MeetingPreferenceService meetingPreferenceService;

    @GetMapping
    public R<MeetingPreferenceVO> get() {
        return R.ok(meetingPreferenceService.get(currentUserId()));
    }

    @PutMapping
    public R<MeetingPreferenceVO> save(@RequestBody MeetingPreferenceSaveReq req) {
        return R.ok(meetingPreferenceService.save(currentUserId(), req));
    }

    private Long currentUserId() {
        UserContext context = UserContextHolder.get();
        if (context == null || context.getId() == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return context.getId();
    }
}

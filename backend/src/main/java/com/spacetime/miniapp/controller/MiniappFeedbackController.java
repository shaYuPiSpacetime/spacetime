package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.MiniappFeedbackSubmitReq;
import com.spacetime.miniapp.service.MiniappFeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/miniapp/feedback")
@RequiredArgsConstructor
public class MiniappFeedbackController {
    private final MiniappFeedbackService feedbackService;

    @PostMapping
    public R<Long> submit(@Valid @RequestBody MiniappFeedbackSubmitReq req) {
        return R.ok(feedbackService.submit(UserContextHolder.get().getId(), req));
    }
}

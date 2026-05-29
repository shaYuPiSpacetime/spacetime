package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.FeedbackPageReq;
import com.spacetime.admin.dto.request.FeedbackStatusUpdateReq;
import com.spacetime.admin.dto.response.AdminFeedbackVO;
import com.spacetime.admin.service.UserSecurityFeedbackAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/user-security/feedback")
@RequiredArgsConstructor
public class UserSecurityFeedbackController {
    private final UserSecurityFeedbackAdminService feedbackAdminService;

    @GetMapping("/list")
    @RequirePermission("user:feedback:list")
    public R<Page<AdminFeedbackVO>> list(FeedbackPageReq req) {
        return R.ok(feedbackAdminService.list(req));
    }

    @GetMapping("/{id}")
    @RequirePermission("user:feedback:list")
    public R<AdminFeedbackVO> detail(@PathVariable Long id) {
        return R.ok(feedbackAdminService.detail(id));
    }

    @PutMapping("/{id}/status")
    @RequirePermission("user:feedback:handle")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody FeedbackStatusUpdateReq req) {
        feedbackAdminService.updateStatus(id, req);
        return R.ok();
    }
}

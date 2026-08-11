package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.AdminConversationVO;
import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.AdminPlatformMessageVO;
import com.spacetime.admin.dto.response.AdminPrivateMessageVO;
import com.spacetime.admin.dto.response.AdminReportLinkVO;
import com.spacetime.admin.dto.response.AdminSensitiveMessageContentVO;
import com.spacetime.admin.dto.response.AdminSystemMessageVO;
import com.spacetime.admin.dto.response.AdminWhisperVO;
import com.spacetime.admin.dto.response.UserMessageSummaryVO;
import com.spacetime.admin.service.AppUserMessageAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** App 用户管理中的消息互动只读接口。 */
@RestController
@RequestMapping("/admin/users/app")
@RequiredArgsConstructor
public class AppUserMessageAdminController {
    private final AppUserMessageAdminService service;

    @GetMapping("/{userId}/messages/summary")
    @RequirePermission("message:summary:view")
    public R<UserMessageSummaryVO> summary(@PathVariable Long userId) {
        return R.ok(service.summary(userId));
    }

    @GetMapping("/{userId}/messages/private-messages")
    @RequirePermission("message:conversation:list")
    public R<Page<AdminPrivateMessageVO>> privateMessages(
            @PathVariable Long userId, @Valid PageReq req) {
        return R.ok(service.privateMessages(userId, req));
    }

    @GetMapping("/{userId}/messages/conversations")
    @RequirePermission("message:conversation:list")
    public R<Page<AdminConversationVO>> conversations(@PathVariable Long userId, @Valid PageReq req) {
        return R.ok(service.conversations(userId, req));
    }

    @GetMapping("/{userId}/messages/whispers")
    @RequirePermission("message:whisper:list")
    public R<Page<AdminWhisperVO>> whispers(@PathVariable Long userId, @Valid PageReq req) {
        return R.ok(service.whispers(userId, req));
    }

    @GetMapping("/{userId}/messages/platform-messages")
    @RequirePermission("message:system:list")
    public R<Page<AdminPlatformMessageVO>> platformMessages(
            @PathVariable Long userId, @Valid PageReq req) {
        return R.ok(service.platformMessages(userId, req));
    }

    @GetMapping("/{userId}/messages/system-messages")
    @RequirePermission("message:system:list")
    public R<Page<AdminSystemMessageVO>> systemMessages(@PathVariable Long userId, @Valid PageReq req) {
        return R.ok(service.systemMessages(userId, req));
    }

    @GetMapping("/{userId}/messages/reports")
    @RequirePermission("community:report:list")
    public R<Page<AdminReportLinkVO>> reports(@PathVariable Long userId, @Valid PageReq req) {
        return R.ok(service.reports(userId, req));
    }

    @PostMapping("/{userId}/messages/private-messages/{messageNo}/content-view")
    @RequirePermission("message:sensitive-content:view")
    public R<AdminSensitiveMessageContentVO> viewPrivateMessageContent(
            @PathVariable Long userId,
            @PathVariable String messageNo,
            @Valid @RequestBody SensitiveContentViewReq req,
            HttpServletResponse response) {
        noStore(response);
        return R.ok(service.viewPrivateMessageContent(userId, messageNo, req));
    }

    @PostMapping("/{userId}/messages/whispers/{whisperNo}/content-view")
    @RequirePermission("message:sensitive-content:view")
    public R<AdminSensitiveMessageContentVO> viewWhisperContent(
            @PathVariable Long userId,
            @PathVariable String whisperNo,
            @Valid @RequestBody SensitiveContentViewReq req,
            HttpServletResponse response) {
        noStore(response);
        return R.ok(service.viewWhisperContent(userId, whisperNo, req));
    }

    private void noStore(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
    }
}

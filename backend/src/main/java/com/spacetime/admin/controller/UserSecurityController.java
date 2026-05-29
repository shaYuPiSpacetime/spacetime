package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.*;
import com.spacetime.admin.service.UserSecurityAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/user-security/users")
@RequiredArgsConstructor
public class UserSecurityController {
    private final UserSecurityAdminService userSecurityAdminService;

    @GetMapping("/{userId}/summary")
    @RequirePermission("user:security:view")
    public R<AdminUserSecuritySummaryVO> summary(@PathVariable Long userId) {
        return R.ok(userSecurityAdminService.summary(userId));
    }

    @GetMapping("/{userId}/privacy")
    @RequirePermission("user:security:view")
    public R<AdminPrivacySettingVO> privacy(@PathVariable Long userId) {
        return R.ok(userSecurityAdminService.privacy(userId));
    }

    @GetMapping("/{userId}/notifications")
    @RequirePermission("user:security:view")
    public R<AdminNotificationSettingVO> notifications(@PathVariable Long userId) {
        return R.ok(userSecurityAdminService.notifications(userId));
    }

    @GetMapping("/{userId}/blacklist")
    @RequirePermission("user:security:view")
    public R<Page<AdminRelationBlockVO>> blacklist(@PathVariable Long userId,
                                                   @RequestParam(defaultValue = "1") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return R.ok(userSecurityAdminService.blacklist(userId, page, size));
    }

    @GetMapping("/{userId}/hidden-dynamics")
    @RequirePermission("user:security:view")
    public R<Page<AdminRelationBlockVO>> hiddenDynamics(@PathVariable Long userId,
                                                        @RequestParam(defaultValue = "1") int page,
                                                        @RequestParam(defaultValue = "20") int size) {
        return R.ok(userSecurityAdminService.hiddenDynamics(userId, page, size));
    }

    @GetMapping("/{userId}/keyword-blocks")
    @RequirePermission("user:security:view")
    public R<List<AdminUserKeywordVO>> keywordBlocks(@PathVariable Long userId) {
        return R.ok(userSecurityAdminService.keywordBlocks(userId));
    }
}

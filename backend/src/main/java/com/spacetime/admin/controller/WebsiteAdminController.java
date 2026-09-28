package com.spacetime.admin.controller;

import com.spacetime.admin.service.WebsiteAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import com.spacetime.common.website.WebsiteData;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 官网活动审核、举报与留存记录入口。 */
@RestController
@RequestMapping("/admin/website")
@RequiredArgsConstructor
public class WebsiteAdminController {
    private final WebsiteAdminService service;
    public record DecisionRequest(String status, String reason) {}
    public record ReasonRequest(String reason) {}

    @GetMapping("/activities") @RequirePermission("website:activity:list")
    public R<List<WebsiteAdminService.AdminActivityView>> activities(@RequestParam(defaultValue = "1") int page,
                                                                      @RequestParam(defaultValue = "50") int size) {
        return R.ok(service.activities(page, size));
    }

    @PostMapping("/activities/{id}/moderate") @RequirePermission("website:activity:audit")
    public R<Void> moderateActivity(@PathVariable Long id, @RequestBody DecisionRequest request) {
        service.moderateActivity(id, request.status(), request.reason()); return R.ok();
    }

    @GetMapping("/messages") @RequirePermission("website:message:list")
    public R<List<WebsiteAdminService.AdminMessageView>> messages(@RequestParam(defaultValue = "1") int page,
                                                                    @RequestParam(defaultValue = "50") int size) {
        return R.ok(service.messages(page, size));
    }

    @PostMapping("/messages/{id}/content-view") @RequirePermission("website:message:content")
    public R<WebsiteAdminService.SensitiveMessageView> viewMessage(@PathVariable Long id,
                                                                     @RequestBody ReasonRequest request) {
        return R.ok(service.viewMessage(id, request.reason()));
    }

    @PostMapping("/messages/{id}/moderate") @RequirePermission("website:message:moderate")
    public R<Void> moderateMessage(@PathVariable Long id, @RequestBody DecisionRequest request) {
        service.moderateMessage(id, request.status(), request.reason()); return R.ok();
    }

    @PostMapping("/messages/export") @RequirePermission("website:message:export")
    public R<String> exportMessages(@RequestBody ReasonRequest request) { return R.ok(service.exportMessages(request.reason())); }

    @GetMapping("/reports") @RequirePermission("website:report:manage")
    public R<List<WebsiteData.Report>> reports(@RequestParam(defaultValue = "1") int page,
                                               @RequestParam(defaultValue = "50") int size) {
        return R.ok(service.reports(page, size));
    }

    @PostMapping("/reports/{id}/resolve") @RequirePermission("website:report:manage")
    public R<Void> resolveReport(@PathVariable Long id, @RequestBody ReasonRequest request) {
        service.resolveReport(id, request.reason()); return R.ok();
    }

    @GetMapping("/audits") @RequirePermission("website:audit:list")
    public R<List<WebsiteData.AuditLog>> audits(@RequestParam(defaultValue = "1") int page,
                                                @RequestParam(defaultValue = "50") int size) {
        return R.ok(service.audits(page, size));
    }
}

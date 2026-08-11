package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.ReportEvidenceVO;
import com.spacetime.admin.dto.response.SensitiveContentVO;
import com.spacetime.admin.service.MessageReportEvidenceAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 管理后台聊天举报证据接口。 */
@RestController
@RequestMapping("/admin/community/reports")
@RequiredArgsConstructor
public class MessageReportEvidenceAdminController {
    private final MessageReportEvidenceAdminService service;

    @GetMapping("/{reportNo}/evidence")
    @RequirePermission("community:report:list")
    public R<List<ReportEvidenceVO>> evidence(@PathVariable String reportNo) {
        return R.ok(service.listEvidence(reportNo));
    }

    @PostMapping("/{reportNo}/evidence/{evidenceNo}/content-view")
    @RequirePermission("message:report-context:view")
    public R<SensitiveContentVO> contentView(@PathVariable String reportNo,
                                             @PathVariable String evidenceNo,
                                             @Valid @RequestBody SensitiveContentViewReq req,
                                             HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        return R.ok(service.viewContent(reportNo, evidenceNo, req));
    }
}

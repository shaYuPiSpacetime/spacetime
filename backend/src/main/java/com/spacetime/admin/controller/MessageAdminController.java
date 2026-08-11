package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.GlobalSendSwitchReq;
import com.spacetime.admin.dto.request.MessageConfigPublishReq;
import com.spacetime.admin.dto.request.MessageTemplatePageReq;
import com.spacetime.admin.dto.request.MessageTemplatePublishReq;
import com.spacetime.admin.dto.request.MessageRecordExportReq;
import com.spacetime.admin.dto.request.MessageRecordPageReq;
import com.spacetime.admin.dto.response.AdminMessageRecordDetailVO;
import com.spacetime.admin.dto.response.AdminMessageRecordVO;
import com.spacetime.admin.dto.response.ContentOperationLogVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.MessageConfigVO;
import com.spacetime.admin.dto.response.MessageRuntimeControlVO;
import com.spacetime.admin.dto.response.MessageRecordStatsVO;
import com.spacetime.admin.dto.response.MessageTemplateVO;
import com.spacetime.admin.service.MessageConfigAdminService;
import com.spacetime.admin.service.MessageRecordAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 管理后台消息规则、模板和记录入口。 */
@RestController
@RequestMapping("/admin/message")
@RequiredArgsConstructor
public class MessageAdminController {
    private final MessageConfigAdminService configService;
    private final MessageRecordAdminService recordService;

    @GetMapping("/records/stats")
    @RequirePermission("message:record:list")
    public R<MessageRecordStatsVO> recordStats(@Valid MessageRecordPageReq req) {
        return R.ok(recordService.stats(req));
    }

    @GetMapping("/records")
    @RequirePermission("message:record:list")
    public R<Page<AdminMessageRecordVO>> records(@Valid MessageRecordPageReq req) {
        return R.ok(recordService.records(req));
    }

    @GetMapping("/records/{recordNo}")
    @RequirePermission("message:record:list")
    public R<AdminMessageRecordDetailVO> recordDetail(@PathVariable String recordNo) {
        return R.ok(recordService.detail(recordNo));
    }

    @PostMapping("/records/export")
    @RequirePermission("message:record:export")
    public R<ExportTaskVO> exportRecords(@Valid @RequestBody MessageRecordExportReq req) {
        return R.ok(recordService.export(req));
    }

    @GetMapping("/config")
    @RequirePermission("message:config:view")
    public R<MessageConfigVO> config() {
        return R.ok(configService.getConfig());
    }

    @PostMapping("/config/versions")
    @RequirePermission("message:config:edit")
    public R<MessageConfigVO> publishConfig(@Valid @RequestBody MessageConfigPublishReq req) {
        return R.ok(configService.publishVersion(req));
    }

    @PostMapping("/config/runtime/global-send")
    @RequirePermission("message:config:edit")
    public R<MessageRuntimeControlVO> globalSend(@Valid @RequestBody GlobalSendSwitchReq req) {
        return R.ok(configService.updateGlobalSend(req));
    }

    @GetMapping("/config/logs")
    @RequirePermission("message:config:view")
    public R<Page<ContentOperationLogVO>> configLogs(@Valid PageReq req) {
        return R.ok(configService.logs(req));
    }

    @GetMapping("/templates")
    @RequirePermission("message:template:view")
    public R<Page<MessageTemplateVO>> templates(@Valid MessageTemplatePageReq req) {
        return R.ok(configService.templates(req));
    }

    @PostMapping("/templates/{templateCode}/versions")
    @RequirePermission("message:template:edit")
    public R<MessageTemplateVO> publishTemplate(@PathVariable String templateCode,
                                                @Valid @RequestBody MessageTemplatePublishReq req) {
        return R.ok(configService.publishTemplate(templateCode, req));
    }
}

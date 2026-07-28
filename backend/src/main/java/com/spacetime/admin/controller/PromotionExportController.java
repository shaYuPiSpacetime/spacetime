package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.PromotionExportDownload;
import com.spacetime.admin.dto.response.PromotionExportTaskVO;
import com.spacetime.admin.service.PromotionAdminService;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

/**
 * 推广导出任务查询与下载。
 *
 * <p>权限不能静态写死，服务层会按任务所属页面校验导出权限，
 * 并限制为任务创建人或超级管理员。</p>
 */
@RestController
@RequestMapping("/admin/promotion/exports")
@RequiredArgsConstructor
public class PromotionExportController {
    private final PromotionAdminService service;

    @GetMapping("/{taskNo}")
    public R<PromotionExportTaskVO> detail(@PathVariable String taskNo) {
        return R.ok(service.exportTask(taskNo));
    }

    @GetMapping("/{taskNo}/download")
    public ResponseEntity<byte[]> download(@PathVariable String taskNo) {
        PromotionExportDownload file = service.downloadExport(taskNo);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(file.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .contentLength(file.content().length)
                .body(file.content());
    }
}

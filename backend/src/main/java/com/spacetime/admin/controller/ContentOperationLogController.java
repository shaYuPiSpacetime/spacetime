package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ContentOperationLogPageReq;
import com.spacetime.admin.dto.response.ContentOperationLogVO;
import com.spacetime.admin.service.ContentOperationLogAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 内容操作日志管理控制器
 */
@RestController
@RequestMapping("/admin/content/operation-logs")
@RequiredArgsConstructor
public class ContentOperationLogController {

    private final ContentOperationLogAdminService contentOperationLogAdminService;

    /**
     * 分页查询操作日志
     *
     * @param req 分页查询条件
     * @return 分页结果
     */
    @GetMapping("/list")
    @RequirePermission("content:operationLog:list")
    public R<Page<ContentOperationLogVO>> list(ContentOperationLogPageReq req) {
        return R.ok(contentOperationLogAdminService.list(req));
    }
}

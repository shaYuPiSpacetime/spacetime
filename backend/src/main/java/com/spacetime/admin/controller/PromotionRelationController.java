package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionInvitePageReq;
import com.spacetime.admin.dto.response.PromotionRelationItemVO;
import com.spacetime.admin.dto.response.PromotionExportTaskVO;
import com.spacetime.admin.service.PromotionAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * 永久邀请关系后台接口。
 */
@RestController
@RequestMapping("/admin/promotion/relations")
@RequiredArgsConstructor
public class PromotionRelationController {
    private final PromotionAdminService service;

    @GetMapping("/list")
    @RequirePermission("promotion:relation:view")
    public R<Page<PromotionRelationItemVO>> list(@Valid PromotionInvitePageReq req) {
        return R.ok(service.relations(req));
    }

    @GetMapping("/{relationNo}")
    @RequirePermission("promotion:relation:view")
    public R<PromotionRelationItemVO> detail(@PathVariable String relationNo) {
        return R.ok(service.relationDetail(relationNo));
    }

    @PostMapping("/export")
    @RequirePermission("promotion:relation:export")
    public R<PromotionExportTaskVO> export(@Valid @RequestBody PromotionInvitePageReq req) {
        return R.ok(service.exportRelations(req));
    }
}

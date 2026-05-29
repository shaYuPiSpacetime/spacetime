package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.CancelRequestPageReq;
import com.spacetime.admin.dto.request.CancelRequestRemarkReq;
import com.spacetime.admin.dto.response.AdminCancelRequestVO;
import com.spacetime.admin.service.UserSecurityCancelAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/user-security/cancel-requests")
@RequiredArgsConstructor
public class UserSecurityCancelController {
    private final UserSecurityCancelAdminService cancelAdminService;

    @GetMapping("/list")
    @RequirePermission("user:cancel:list")
    public R<Page<AdminCancelRequestVO>> list(CancelRequestPageReq req) {
        return R.ok(cancelAdminService.list(req));
    }

    @GetMapping("/{id}")
    @RequirePermission("user:cancel:list")
    public R<AdminCancelRequestVO> detail(@PathVariable Long id) {
        return R.ok(cancelAdminService.detail(id));
    }

    @PutMapping("/{id}/remark")
    @RequirePermission("user:cancel:handle")
    public R<Void> remark(@PathVariable Long id, @Valid @RequestBody CancelRequestRemarkReq req) {
        cancelAdminService.remark(id, req);
        return R.ok();
    }
}

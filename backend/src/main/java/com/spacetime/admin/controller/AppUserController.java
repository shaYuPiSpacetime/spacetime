package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.request.UpdateStatusReq;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.AppUserListVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.ImportBatchVO;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 管理后台 — 小程序用户管理接口
 * 提供用户列表分页查询、详情查看、账号状态变更（冻结/解冻）
 */
@RestController
@RequestMapping("/admin/users/app")
@RequiredArgsConstructor
public class AppUserController {

    private final AppUserAdminService appUserAdminService;

    /**
     * 用户列表分页查询
     * @param req 筛选条件（关键词/昵称/学校/性别/状态/认证状态）
     * @return 分页用户列表
     */
    @GetMapping("/list")
    @RequirePermission("user:app:list")
    public R<Page<AppUserListVO>> list(@Valid AppUserPageReq req) {
        return R.ok(appUserAdminService.getUserPage(req));
    }

    /**
     * 用户详情
     * @param id 用户ID
     * @return 用户完整资料 + 认证信息
     */
    @GetMapping("/{id}")
    @RequirePermission("user:app:detail")
    public R<AppUserDetailVO> detail(@PathVariable Long id) {
        return R.ok(appUserAdminService.getUserDetail(id));
    }

    /**
     * 变更用户账号状态（冻结/解冻）
     * @param id 用户ID
     * @param req 目标状态
     */
    @PutMapping("/{id}/status")
    @RequirePermission("user:app:freeze")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusReq req) {
        appUserAdminService.updateUserStatus(id, req.getStatus());
        return R.ok();
    }

    /**
     * 批量导入 App 用户预校验。
     *
     * @param file CSV 文件，首版按模板表头预校验
     * @return 批次统计
     */
    @PostMapping("/import")
    @RequirePermission("user:app:import")
    public R<ImportBatchVO> previewImport(@RequestParam("file") MultipartFile file) {
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            return R.ok(appUserAdminService.previewImport(file.getOriginalFilename(), content));
        } catch (IOException e) {
            throw new BusinessException("导入文件读取失败");
        }
    }

    /**
     * 创建固定字段导出任务。
     *
     * @param req           筛选条件
     * @param confirmNoMask 是否确认固定字段不掩码导出
     * @return 导出任务
     */
    @PostMapping("/export")
    @RequirePermission("user:app:export")
    public R<ExportTaskVO> export(AppUserPageReq req,
                                  @RequestParam(defaultValue = "false") boolean confirmNoMask) {
        return R.ok(appUserAdminService.exportFixedFields(req, confirmNoMask));
    }
}

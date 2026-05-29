package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.MobileEntryConfigSaveReq;
import com.spacetime.admin.dto.request.MobileEntrySortReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.MobileEntryConfigVO;
import com.spacetime.admin.service.MobileEntryConfigAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 移动端入口配置管理控制器
 */
@RestController
@RequestMapping("/admin/content/mobile-entries")
@RequiredArgsConstructor
public class MobileEntryConfigController {

    private final MobileEntryConfigAdminService mobileEntryConfigAdminService;

    /**
     * 按页面编码查询入口列表
     *
     * @param pageCode 页面编码
     * @return 入口列表
     */
    @GetMapping("/list")
    @RequirePermission("content:entry:list")
    public R<List<MobileEntryConfigVO>> list(@RequestParam String pageCode) {
        return R.ok(mobileEntryConfigAdminService.list(pageCode));
    }

    /**
     * 创建入口配置
     *
     * @param req 创建请求
     * @return 新入口 ID
     */
    @PostMapping
    @RequirePermission("content:entry:add")
    public R<Long> create(@Valid @RequestBody MobileEntryConfigSaveReq req) {
        return R.ok(mobileEntryConfigAdminService.create(req));
    }

    /**
     * 更新入口配置
     *
     * @param id  入口 ID
     * @param req 更新请求
     */
    @PutMapping("/{id}")
    @RequirePermission("content:entry:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody MobileEntryConfigSaveReq req) {
        mobileEntryConfigAdminService.update(id, req);
        return R.ok();
    }

    /**
     * 更新入口状态
     *
     * @param id  入口 ID
     * @param req 状态变更请求
     */
    @PutMapping("/{id}/status")
    @RequirePermission("content:entry:edit")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateReq req) {
        mobileEntryConfigAdminService.updateStatus(id, req);
        return R.ok();
    }

    /**
     * 批量更新排序
     *
     * @param req 排序请求
     */
    @PutMapping("/sort")
    @RequirePermission("content:entry:edit")
    public R<Void> sort(@Valid @RequestBody MobileEntrySortReq req) {
        mobileEntryConfigAdminService.sort(req);
        return R.ok();
    }

    /**
     * 删除入口配置
     *
     * @param id 入口 ID
     */
    @DeleteMapping("/{id}")
    @RequirePermission("content:entry:delete")
    public R<Void> delete(@PathVariable Long id) {
        mobileEntryConfigAdminService.delete(id);
        return R.ok();
    }
}

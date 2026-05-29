package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SearchBlockWordPageReq;
import com.spacetime.admin.dto.request.SearchBlockWordSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.SearchBlockWordVO;
import com.spacetime.admin.service.SearchBlockWordAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 搜索屏蔽词管理控制器
 */
@RestController
@RequestMapping("/admin/content/search-block-words")
@RequiredArgsConstructor
public class SearchBlockWordController {

    private final SearchBlockWordAdminService searchBlockWordAdminService;

    /**
     * 分页查询屏蔽词列表
     *
     * @param req 分页查询条件
     * @return 分页结果
     */
    @GetMapping("/list")
    @RequirePermission("content:blockWord:list")
    public R<Page<SearchBlockWordVO>> list(SearchBlockWordPageReq req) {
        return R.ok(searchBlockWordAdminService.list(req));
    }

    /**
     * 创建屏蔽词
     *
     * @param req 创建请求
     * @return 新屏蔽词 ID
     */
    @PostMapping
    @RequirePermission("content:blockWord:add")
    public R<Long> create(@Valid @RequestBody SearchBlockWordSaveReq req) {
        return R.ok(searchBlockWordAdminService.create(req));
    }

    /**
     * 更新屏蔽词
     *
     * @param id  屏蔽词 ID
     * @param req 更新请求
     */
    @PutMapping("/{id}")
    @RequirePermission("content:blockWord:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody SearchBlockWordSaveReq req) {
        searchBlockWordAdminService.update(id, req);
        return R.ok();
    }

    /**
     * 更新屏蔽词状态
     *
     * @param id  屏蔽词 ID
     * @param req 状态变更请求
     */
    @PutMapping("/{id}/status")
    @RequirePermission("content:blockWord:edit")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateReq req) {
        searchBlockWordAdminService.updateStatus(id, req);
        return R.ok();
    }

    /**
     * 删除屏蔽词
     *
     * @param id 屏蔽词 ID
     */
    @DeleteMapping("/{id}")
    @RequirePermission("content:blockWord:delete")
    public R<Void> delete(@PathVariable Long id) {
        searchBlockWordAdminService.delete(id);
        return R.ok();
    }
}

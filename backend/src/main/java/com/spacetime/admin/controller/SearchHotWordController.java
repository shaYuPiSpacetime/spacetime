package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.SearchHotWordPageReq;
import com.spacetime.admin.dto.request.SearchHotWordSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.SearchHotWordVO;
import com.spacetime.admin.service.SearchHotWordAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 搜索热词管理控制器
 */
@RestController
@RequestMapping("/admin/content/search-hot-words")
@RequiredArgsConstructor
public class SearchHotWordController {

    private final SearchHotWordAdminService searchHotWordAdminService;

    /**
     * 分页查询热词列表
     *
     * @param req 分页查询条件
     * @return 分页结果
     */
    @GetMapping("/list")
    @RequirePermission("content:hotWord:list")
    public R<Page<SearchHotWordVO>> list(SearchHotWordPageReq req) {
        return R.ok(searchHotWordAdminService.list(req));
    }

    /**
     * 创建热词
     *
     * @param req 创建请求
     * @return 新热词 ID
     */
    @PostMapping
    @RequirePermission("content:hotWord:add")
    public R<Long> create(@Valid @RequestBody SearchHotWordSaveReq req) {
        return R.ok(searchHotWordAdminService.create(req));
    }

    /**
     * 更新热词
     *
     * @param id  热词 ID
     * @param req 更新请求
     */
    @PutMapping("/{id}")
    @RequirePermission("content:hotWord:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody SearchHotWordSaveReq req) {
        searchHotWordAdminService.update(id, req);
        return R.ok();
    }

    /**
     * 更新热词状态
     *
     * @param id  热词 ID
     * @param req 状态变更请求
     */
    @PutMapping("/{id}/status")
    @RequirePermission("content:hotWord:edit")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateReq req) {
        searchHotWordAdminService.updateStatus(id, req);
        return R.ok();
    }

    /**
     * 删除热词
     *
     * @param id 热词 ID
     */
    @DeleteMapping("/{id}")
    @RequirePermission("content:hotWord:delete")
    public R<Void> delete(@PathVariable Long id) {
        searchHotWordAdminService.delete(id);
        return R.ok();
    }
}

package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ContentArticlePageReq;
import com.spacetime.admin.dto.request.ContentArticleSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.ContentArticleVO;
import com.spacetime.admin.service.ContentArticleAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 内容文章管理控制器
 */
@RestController
@RequestMapping("/admin/content/articles")
@RequiredArgsConstructor
public class ContentArticleController {

    private final ContentArticleAdminService contentArticleAdminService;

    /**
     * 分页查询文章列表
     *
     * @param req 分页查询条件
     * @return 分页结果
     */
    @GetMapping("/list")
    @RequirePermission("content:article:list")
    public R<Page<ContentArticleVO>> list(ContentArticlePageReq req) {
        return R.ok(contentArticleAdminService.list(req));
    }

    /**
     * 查询文章详情
     *
     * @param id 文章 ID
     * @return 文章详情
     */
    @GetMapping("/{id}")
    @RequirePermission("content:article:list")
    public R<ContentArticleVO> detail(@PathVariable Long id) {
        return R.ok(contentArticleAdminService.detail(id));
    }

    /**
     * 创建文章
     *
     * @param req 创建请求
     * @return 新文章 ID
     */
    @PostMapping
    @RequirePermission("content:article:add")
    public R<Long> create(@Valid @RequestBody ContentArticleSaveReq req) {
        return R.ok(contentArticleAdminService.create(req));
    }

    /**
     * 更新文章
     *
     * @param id  文章 ID
     * @param req 更新请求
     */
    @PutMapping("/{id}")
    @RequirePermission("content:article:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody ContentArticleSaveReq req) {
        contentArticleAdminService.update(id, req);
        return R.ok();
    }

    /**
     * 更新文章状态
     *
     * @param id  文章 ID
     * @param req 状态变更请求
     */
    @PutMapping("/{id}/status")
    @RequirePermission("content:article:publish")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateReq req) {
        contentArticleAdminService.updateStatus(id, req);
        return R.ok();
    }

    /**
     * 删除文章
     *
     * @param id 文章 ID
     */
    @DeleteMapping("/{id}")
    @RequirePermission("content:article:delete")
    public R<Void> delete(@PathVariable Long id) {
        contentArticleAdminService.delete(id);
        return R.ok();
    }
}

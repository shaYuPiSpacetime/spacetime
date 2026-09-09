package com.spacetime.admin.controller;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.*;
import com.spacetime.admin.service.SensitiveWordService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
/** 根级敏感词管理资源，沿用 X-Auth-Token 和真实 RBAC 拦截器。 */
@RestController @RequestMapping("/admin/sensitive-words") @RequiredArgsConstructor
public class SensitiveWordController {
    private final SensitiveWordService service;
    /** 分页查询。 */
    @GetMapping({"","/"}) @RequirePermission("sensitive-word:list")
    public R<Page<SensitiveWordVO>> page(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size,
        @RequestParam(required=false) String keyword,@RequestParam(required=false) String categoryCode,@RequestParam(required=false) String status){return R.ok(service.page(page,size,keyword,categoryCode,status));}
    /** 分类选项。 */
    @GetMapping("/categories") @RequirePermission("sensitive-word:list")
    public R<List<SensitiveWordCategoryVO>> categories(){return R.ok(service.categories());}
    /** 详情。 */
    @GetMapping("/{id}") @RequirePermission("sensitive-word:list")
    public R<SensitiveWordVO> detail(@PathVariable Long id){return R.ok(service.detail(id));}
    /** 新增。 */
    @PostMapping({"","/"}) @RequirePermission("sensitive-word:add")
    public R<Long> create(@RequestBody SensitiveWordSaveReq req){return R.ok(service.create(req));}
    /** 完整编辑。 */
    @PutMapping("/{id}") @RequirePermission("sensitive-word:edit")
    public R<Void> update(@PathVariable Long id,@RequestBody SensitiveWordSaveReq req){service.update(id,req);return R.ok();}
    /** 只更新状态。 */
    @PatchMapping("/{id}/status") @RequirePermission("sensitive-word:edit")
    public R<Void> status(@PathVariable Long id,@RequestBody SensitiveWordStatusReq req){service.changeStatus(id,req.getStatus());return R.ok();}
    /** 逻辑删除。 */
    @DeleteMapping("/{id}") @RequirePermission("sensitive-word:delete")
    public R<Void> delete(@PathVariable Long id){service.delete(id);return R.ok();}
}

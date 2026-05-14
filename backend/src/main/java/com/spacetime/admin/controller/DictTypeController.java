package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.DictTypeCreateReq;
import com.spacetime.admin.dto.request.DictTypePageReq;
import com.spacetime.admin.dto.request.DictTypeUpdateReq;
import com.spacetime.admin.dto.response.DictTypeVO;
import com.spacetime.admin.service.DictTypeService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 字典类型管理控制器
 */
@RestController
@RequestMapping("/admin/dict-type")
@RequiredArgsConstructor
public class DictTypeController {

    private final DictTypeService dictTypeService;

    /** 分页查询字典类型列表 */
    @GetMapping("/list")
    @RequirePermission("system:dict:list")
    public R<Page<DictTypeVO>> list(@Valid DictTypePageReq req) {
        return R.ok(dictTypeService.list(req));
    }

    /** 查询全部启用字典类型（下拉选择用） */
    @GetMapping("/all")
    public R<List<DictTypeVO>> all() {
        return R.ok(dictTypeService.all());
    }

    /** 创建字典类型 */
    @PostMapping
    @RequirePermission("system:dict:add")
    public R<Long> create(@Valid @RequestBody DictTypeCreateReq req) {
        return R.ok(dictTypeService.create(req));
    }

    /** 更新字典类型 */
    @PutMapping("/{id}")
    @RequirePermission("system:dict:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody DictTypeUpdateReq req) {
        req.setId(id);
        dictTypeService.update(req);
        return R.ok();
    }

    /** 删除字典类型（同时删除关联的字典数据） */
    @DeleteMapping("/{id}")
    @RequirePermission("system:dict:delete")
    public R<Void> delete(@PathVariable Long id) {
        dictTypeService.delete(id);
        return R.ok();
    }
}

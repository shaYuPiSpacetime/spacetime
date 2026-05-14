package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.DictDataCreateReq;
import com.spacetime.admin.dto.request.DictDataUpdateReq;
import com.spacetime.admin.dto.response.DictDataVO;
import com.spacetime.admin.service.DictDataService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 字典数据管理控制器
 */
@RestController
@RequestMapping("/admin/dict-data")
@RequiredArgsConstructor
public class DictDataController {

    private final DictDataService dictDataService;

    /** 按字典类型编码查询树形结构 */
    @GetMapping("/tree")
    @RequirePermission("system:dict:list")
    public R<List<DictDataVO>> tree(@RequestParam String dictType) {
        return R.ok(dictDataService.tree(dictType));
    }

    /** 创建字典数据 */
    @PostMapping
    @RequirePermission("system:dict:add")
    public R<Long> create(@Valid @RequestBody DictDataCreateReq req) {
        return R.ok(dictDataService.create(req));
    }

    /** 更新字典数据 */
    @PutMapping("/{id}")
    @RequirePermission("system:dict:edit")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody DictDataUpdateReq req) {
        req.setId(id);
        dictDataService.update(req);
        return R.ok();
    }

    /** 删除字典数据（级联删除子节点） */
    @DeleteMapping("/{id}")
    @RequirePermission("system:dict:delete")
    public R<Void> delete(@PathVariable Long id) {
        dictDataService.delete(id);
        return R.ok();
    }
}

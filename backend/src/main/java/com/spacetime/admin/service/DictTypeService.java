package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.DictTypeCreateReq;
import com.spacetime.admin.dto.request.DictTypePageReq;
import com.spacetime.admin.dto.request.DictTypeUpdateReq;
import com.spacetime.admin.dto.response.DictTypeVO;

import java.util.List;

/**
 * 字典类型服务接口
 */
public interface DictTypeService {
    /** 分页查询字典类型列表 */
    Page<DictTypeVO> list(DictTypePageReq req);
    /** 查询全部启用字典类型（下拉选择用） */
    List<DictTypeVO> all();
    /** 创建字典类型，返回主键 ID */
    Long create(DictTypeCreateReq req);
    /** 更新字典类型 */
    void update(DictTypeUpdateReq req);
    /** 删除字典类型 */
    void delete(Long id);
}

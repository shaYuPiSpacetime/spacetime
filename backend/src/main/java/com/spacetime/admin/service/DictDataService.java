package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.DictDataCreateReq;
import com.spacetime.admin.dto.request.DictDataUpdateReq;
import com.spacetime.admin.dto.response.DictDataVO;

import java.util.List;

/**
 * 字典数据服务接口
 */
public interface DictDataService {
    /** 按字典类型编码查询树形结构 */
    List<DictDataVO> tree(String dictType);
    /** 创建字典数据，返回主键 ID */
    Long create(DictDataCreateReq req);
    /** 更新字典数据 */
    void update(DictDataUpdateReq req);
    /** 删除字典数据（级联删除子节点） */
    void delete(Long id);
}

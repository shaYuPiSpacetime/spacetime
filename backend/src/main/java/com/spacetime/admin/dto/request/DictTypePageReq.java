package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 字典类型分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class DictTypePageReq extends PageReq {
    /** 搜索关键字（匹配字典名称或编码） */
    private String keyword;
    /** 状态筛选：ENABLED=启用 / DISABLED=禁用 */
    private String status;
}

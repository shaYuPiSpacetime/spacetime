package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 角色分页查询请求体
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class RolePageReq extends PageReq {
    /** 搜索关键词（匹配角色名称、编码） */
    private String keyword;
    /** 状态筛选：ENABLED=启用 / DISABLED=禁用 */
    private String status;
}

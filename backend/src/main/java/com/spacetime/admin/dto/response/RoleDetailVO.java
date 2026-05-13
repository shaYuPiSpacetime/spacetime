package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 角色详情响应体（含菜单 ID 列表）
 */
@Data
public class RoleDetailVO {
    /** 角色 ID */
    private Long id;
    /** 角色名称 */
    private String roleName;
    /** 角色编码（唯一） */
    private String roleCode;
    /** 角色分组 */
    private String roleGroup;
    /** 排序号 */
    private Integer roleSort;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    private String status;
    /** 备注 */
    private String remark;
    /** 拥有的菜单 ID 列表 */
    private List<Long> menuIds;
    /** 创建时间 */
    private LocalDateTime createTime;
}

package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 角色列表响应体
 */
@Data
public class RoleVO {
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
    /** 创建时间 */
    private LocalDateTime createTime;
}

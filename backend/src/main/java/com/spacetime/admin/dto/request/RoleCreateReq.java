package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 角色创建请求体
 */
@Data
public class RoleCreateReq {
    /** 角色名称 */
    @NotBlank(message = "角色名称不能为空")
    private String roleName;
    /** 角色编码（唯一） */
    @NotBlank(message = "角色编码不能为空")
    private String roleCode;
    /** 角色分组 */
    private String roleGroup;
    /** 排序号 */
    private Integer roleSort;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    private String status;
    /** 备注 */
    private String remark;
}

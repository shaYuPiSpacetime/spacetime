package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 系统角色实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_role")
public class SysRole extends BaseEntity {
    /** 角色名称 */
    private String roleName;
    /** 角色编码（唯一），如 admin, editor */
    private String roleCode;
    /** 角色分组，如 系统管理 */
    private String roleGroup;
    /** 排序号 */
    private Integer roleSort;
    /** 状态 @see CommonStatusEnum */
    private String status;
    /** 备注 */
    private String remark;
}

package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 用户-角色关联实体
 */
@Data
@TableName("sys_user_role")
public class SysUserRole {
    /** 主键 */
    private Long id;
    /** 用户 ID */
    private Long userId;
    /** 角色 ID */
    private Long roleId;
}

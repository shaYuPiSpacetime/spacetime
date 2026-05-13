package com.spacetime.admin.dto.request;

import lombok.Data;

import java.util.List;

/**
 * 角色绑定菜单请求体
 */
@Data
public class RoleMenuReq {
    /** 角色 ID（由 Controller 从 @PathVariable 注入） */
    private Long roleId;
    /** 菜单 ID 列表 */
    private List<Long> menuIds;
}

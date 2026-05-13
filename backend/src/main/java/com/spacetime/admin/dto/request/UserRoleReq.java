package com.spacetime.admin.dto.request;

import lombok.Data;

import java.util.List;

/**
 * 用户分配角色请求体
 */
@Data
public class UserRoleReq {
    /** 用户 ID（由 Controller 从 @PathVariable 注入） */
    private Long userId;
    /** 角色 ID 列表 */
    private List<Long> roleIds;
}

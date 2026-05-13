package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户分页查询请求体
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class UserPageReq extends PageReq {
    /** 搜索关键词（匹配用户名、昵称、邮箱） */
    private String keyword;
    /** 状态筛选：ENABLED=启用 / DISABLED=禁用 */
    private String status;
}

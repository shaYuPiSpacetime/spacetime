package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 管理后台 — 认证审核分页查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class VerificationPageReq extends PageReq {
    /** 用户ID精确筛选 */
    private Long userId;
    /** 认证状态筛选 @see VerificationStatusEnum */
    private String status;
    /** 关键词模糊筛选 */
    private String keyword;
}

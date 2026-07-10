package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 认证审核头部统计视图。
 */
@Data
public class VerificationStatsVO {
    /** 待审核数量 */
    private Long pendingCount;
    /** 审核中数量 */
    private Long reviewingCount;
    /** 今日通过数量，按审核结果时间统计 */
    private Long approvedTodayCount;
    /** 今日驳回数量，按审核结果时间统计 */
    private Long rejectedTodayCount;
    /** 已失效数量 */
    private Long expiredCount;
}

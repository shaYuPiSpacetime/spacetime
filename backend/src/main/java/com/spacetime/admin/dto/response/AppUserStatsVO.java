package com.spacetime.admin.dto.response;

import lombok.Data;

/** APP 用户管理页头部统计。 */
@Data
public class AppUserStatsVO {
    /** 未逻辑删除的当前用户数。 */
    private Long currentUserCount;
    /** 当前满足核心准入条件的用户数。 */
    private Long coreAccessAllowedCount;
    /** 当前关系反馈准入为 OPEN 的用户数。 */
    private Long relationshipAccessOpenCount;
    /** 最近滚动 7 天实际访问事件中的去重访客数。 */
    private Long visitorUv7d;
}

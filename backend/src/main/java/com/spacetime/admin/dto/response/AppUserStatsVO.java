package com.spacetime.admin.dto.response;

import lombok.Data;

/** APP 用户管理页头部统计。 */
@Data
public class AppUserStatsVO {
    /** 未逻辑删除的当前用户数。 */
    private Long currentUserCount;
    /** 当前满足核心准入条件的用户数。 */
    private Long coreAccessAllowedCount;
}

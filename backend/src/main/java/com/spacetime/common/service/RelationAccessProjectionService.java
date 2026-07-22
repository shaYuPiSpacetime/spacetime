package com.spacetime.common.service;

import com.spacetime.common.entity.AppUser;

/** PRD-01 核心准入状态到关系准入状态的统一投影服务。 */
public interface RelationAccessProjectionService {
    /** 返回 OPEN-开放、CLOSED-未开放或 ABNORMAL-账号异常。 */
    String project(AppUser user);

    /** 使用已批量装载的认证结论和年龄范围投影，避免列表逐行查询。 */
    String project(AppUser user, boolean tripleApproved, int minAge, int maxAge);
}

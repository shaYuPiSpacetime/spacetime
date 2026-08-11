package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 按用户幂等补齐当前有效平台公告系统消息。 */
public interface MessageAnnouncementHydrationService {
    void hydrate(Long userId, LocalDateTime now);
}

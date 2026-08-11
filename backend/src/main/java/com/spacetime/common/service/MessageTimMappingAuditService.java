package com.spacetime.common.service;

import java.time.LocalDateTime;

/** Audits local TIM message mappings without resending third-party messages. */
public interface MessageTimMappingAuditService {
    int auditLocalMappings(LocalDateTime now, int limit);
}

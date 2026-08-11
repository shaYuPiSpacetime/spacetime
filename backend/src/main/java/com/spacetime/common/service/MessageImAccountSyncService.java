package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 补偿同步待处理或失败的腾讯云 TIM 用户账号。 */
public interface MessageImAccountSyncService {
    int syncPending(LocalDateTime now, int limit);
}

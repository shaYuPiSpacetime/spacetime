package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.service.MessageRetentionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** 消息正文到期清理实现，不删除业务事实。 */
@Service
@RequiredArgsConstructor
public class MessageRetentionServiceImpl implements MessageRetentionService {
    private final AppMessageRecordDao recordDao;

    @Override
    @Transactional
    public int clearExpiredMessageContent(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        return recordDao.clearExpiredContent(effectiveNow, Math.max(1, Math.min(limit, 1000)));
    }
}

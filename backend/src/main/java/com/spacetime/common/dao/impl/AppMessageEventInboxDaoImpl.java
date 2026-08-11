package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppMessageEventInboxDao;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.mapper.AppMessageEventInboxMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 消息事件 Inbox 数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageEventInboxDaoImpl implements AppMessageEventInboxDao {
    private final AppMessageEventInboxMapper mapper;

    @Override
    public AppMessageEventInbox selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppMessageEventInbox selectByEventKey(String eventKey) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageEventInbox>()
                .eq(AppMessageEventInbox::getEventKey, eventKey));
    }

    @Override
    public List<AppMessageEventInbox> selectClaimable(LocalDateTime now,
                                                       LocalDateTime staleBefore, int limit) {
        return mapper.selectClaimable(now, staleBefore, Math.max(1, Math.min(limit, 1000)));
    }

    @Override
    public void insert(AppMessageEventInbox entity) {
        mapper.insert(entity);
    }

    @Override
    public int claim(Long id, LocalDateTime now, LocalDateTime staleBefore) {
        return mapper.claim(id, now, staleBefore);
    }

    @Override
    public int markSuccessAndClearPayload(Long id, LocalDateTime processedAt) {
        return mapper.markSuccessAndClearPayload(id, processedAt);
    }

    @Override
    public int markFailure(Long id, int retryCount, boolean dead, LocalDateTime nextRetryTime,
                           String errorCode, String errorSummary, LocalDateTime now) {
        return mapper.markFailure(id, retryCount, dead ? "dead" : "failed", dead ? 1 : 0,
                nextRetryTime, errorCode, errorSummary, now);
    }

    @Override
    public int clearExpiredPayloads(LocalDateTime now, int limit) {
        return mapper.clearExpiredPayloads(now, Math.max(1, Math.min(limit, 1000)));
    }
}

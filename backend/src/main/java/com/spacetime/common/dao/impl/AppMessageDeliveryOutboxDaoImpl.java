package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.mapper.AppMessageDeliveryOutboxMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 消息渠道 Outbox 数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageDeliveryOutboxDaoImpl implements AppMessageDeliveryOutboxDao {
    private final AppMessageDeliveryOutboxMapper mapper;

    @Override
    public AppMessageDeliveryOutbox selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppMessageDeliveryOutbox selectByEventAndChannel(String eventKey, String channel) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageDeliveryOutbox>()
                .eq(AppMessageDeliveryOutbox::getEventKey, eventKey)
                .eq(AppMessageDeliveryOutbox::getChannel, channel));
    }

    @Override
    public AppMessageDeliveryOutbox selectByAggregate(String aggregateType, Long aggregateId,
                                                       String channel) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageDeliveryOutbox>()
                .eq(AppMessageDeliveryOutbox::getAggregateType, aggregateType)
                .eq(AppMessageDeliveryOutbox::getAggregateId, aggregateId)
                .eq(AppMessageDeliveryOutbox::getChannel, channel));
    }

    @Override
    public List<AppMessageDeliveryOutbox> selectClaimable(LocalDateTime now,
                                                           LocalDateTime staleBefore, int limit) {
        return mapper.selectClaimable(now, staleBefore, Math.max(1, Math.min(limit, 1000)));
    }

    @Override
    public List<AppMessageDeliveryOutbox> selectMappingInconsistencies(LocalDateTime staleBefore,
                                                                        int limit) {
        return mapper.selectMappingInconsistencies(staleBefore,
                Math.max(1, Math.min(limit, 1000)));
    }

    @Override
    public void insert(AppMessageDeliveryOutbox entity) {
        mapper.insert(entity);
    }

    @Override
    public int claim(Long id, LocalDateTime now, LocalDateTime staleBefore) {
        return mapper.claim(id, now, staleBefore);
    }

    @Override
    public int markSent(Long id, String providerMsgKey, LocalDateTime sentAt) {
        return mapper.markSent(id, providerMsgKey, sentAt);
    }

    @Override
    public int confirmCallback(Long id, String providerMsgKey, LocalDateTime confirmedAt) {
        return mapper.confirmCallback(id, providerMsgKey, confirmedAt);
    }

    @Override
    public int markFailure(Long id, int retryCount, boolean dead, LocalDateTime nextRetryTime,
                           String errorCode, String errorSummary, LocalDateTime now) {
        return mapper.markFailure(id, retryCount, dead ? "dead" : "failed",
                nextRetryTime, errorCode, errorSummary, now);
    }
}

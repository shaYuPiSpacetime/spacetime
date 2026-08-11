package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.CommunityMessageOutboxDao;
import com.spacetime.common.entity.CommunityEventOutbox;
import com.spacetime.common.mapper.CommunityEventOutboxMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 社区事件到消息中心的可靠消费数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class CommunityMessageOutboxDaoImpl implements CommunityMessageOutboxDao {
    private final CommunityEventOutboxMapper mapper;

    @Override
    public CommunityEventOutbox selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public List<CommunityEventOutbox> selectClaimable(LocalDateTime now,
                                                       LocalDateTime staleBefore, int limit) {
        return mapper.selectClaimable(now, staleBefore, Math.max(1, Math.min(limit, 1000)));
    }

    @Override
    public int claim(Long id, LocalDateTime now, LocalDateTime staleBefore) {
        return mapper.claim(id, now, staleBefore);
    }

    @Override
    public int markSent(Long id, LocalDateTime sentAt) {
        return mapper.markSent(id, sentAt);
    }

    @Override
    public int markFailure(Long id, int retryCount, boolean dead,
                           LocalDateTime nextRetryAt, String lastError, LocalDateTime now) {
        return mapper.markFailure(id, retryCount, dead ? "dead" : "failed",
                nextRetryAt, lastError, now);
    }
}

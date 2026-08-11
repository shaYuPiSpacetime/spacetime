package com.spacetime.common.dao;

import com.spacetime.common.entity.CommunityEventOutbox;

import java.time.LocalDateTime;
import java.util.List;

/** 社区事件到消息中心的可靠消费数据访问接口。 */
public interface CommunityMessageOutboxDao {
    CommunityEventOutbox selectById(Long id);
    List<CommunityEventOutbox> selectClaimable(LocalDateTime now, LocalDateTime staleBefore,
                                                int limit);
    int claim(Long id, LocalDateTime now, LocalDateTime staleBefore);
    int markSent(Long id, LocalDateTime sentAt);
    int markFailure(Long id, int retryCount, boolean dead, LocalDateTime nextRetryAt,
                    String lastError, LocalDateTime now);
}

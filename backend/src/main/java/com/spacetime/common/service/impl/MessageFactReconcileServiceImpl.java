package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.service.MessageConversationLifecycleService;
import com.spacetime.common.service.MessageFactReconcileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 最近 24 小时匹配事实与私信会话投影对账。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageFactReconcileServiceImpl implements MessageFactReconcileService {
    private final AppRelationMatchDao matchDao;
    private final MessageConversationLifecycleService conversationLifecycleService;

    @Override
    public int reconcileRecentMatches(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        int batchSize = Math.max(1, Math.min(limit, 500));
        List<AppRelationMatch> matches = matchDao.selectActiveMissingConversations(
                effectiveNow.minusHours(24), batchSize);
        if (matches == null || matches.isEmpty()) {
            return 0;
        }
        int processed = 0;
        for (AppRelationMatch match : matches) {
            try {
                conversationLifecycleService.ensureForMatch(
                        match, match.getPrimarySource(), match.getMatchedTime());
                processed++;
            } catch (RuntimeException ex) {
                log.warn("匹配会话事实对账失败: matchNo={}, errorType={}",
                        match.getMatchNo(), ex.getClass().getSimpleName());
            }
        }
        return processed;
    }
}

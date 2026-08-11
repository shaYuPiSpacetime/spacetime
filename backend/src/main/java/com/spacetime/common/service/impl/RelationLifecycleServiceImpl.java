package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppRelationMatchPopupDao;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.enums.MessageConversationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.RelationLifecycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** 关系批量失效事务实现，永久保留历史事实。 */
@Service
@RequiredArgsConstructor
public class RelationLifecycleServiceImpl implements RelationLifecycleService {
    private static final int RELATION_PARAM_ERROR = 20008;

    private final AppRelationLikeDao likeDao;
    private final AppRelationVisitDao visitDao;
    private final AppRelationMatchDao matchDao;
    private final AppRelationMatchSourceDao matchSourceDao;
    private final AppRelationMatchPopupDao matchPopupDao;
    private final AppMessageWhisperDao whisperDao;
    private final AppMessageConversationDao conversationDao;
    private final AppMessageRecordDao messageRecordDao;

    @Override
    @Transactional
    public void invalidateByUser(Long userId, RelationInvalidReasonEnum reason, LocalDateTime invalidTime) {
        require(userId, reason);
        LocalDateTime eventTime = invalidTime == null ? LocalDateTime.now() : invalidTime;
        List<Long> matchIds = matchDao.selectActiveByUser(userId).stream().map(AppRelationMatch::getId).toList();
        likeDao.invalidateByUser(userId, reason.getCode(), eventTime);
        visitDao.invalidateByUser(userId, reason.getCode(), eventTime);
        whisperDao.invalidateByUser(userId, reason.getCode(), eventTime);
        conversationDao.invalidateByUser(userId, conversationStatus(reason), reason.getCode(), eventTime);
        messageRecordDao.schedulePurgeByUser(userId, eventTime);
        invalidateMatches(matchIds, reason, eventTime);
    }

    @Override
    @Transactional
    public void invalidateByPair(Long userA, Long userB, RelationInvalidReasonEnum reason, LocalDateTime invalidTime) {
        require(userA, reason);
        require(userB, reason);
        if (userA.equals(userB)) {
            throw new BusinessException(RELATION_PARAM_ERROR, "关系双方不能是同一用户");
        }
        Long low = Math.min(userA, userB);
        Long high = Math.max(userA, userB);
        LocalDateTime eventTime = invalidTime == null ? LocalDateTime.now() : invalidTime;
        AppRelationMatch match = matchDao.selectActivePair(low, high);
        likeDao.invalidateByPair(low, high, reason.getCode(), eventTime);
        visitDao.invalidateByPair(low, high, reason.getCode(), eventTime);
        whisperDao.invalidateByPair(low, high, reason.getCode(), eventTime);
        conversationDao.invalidateByPair(low, high, conversationStatus(reason), reason.getCode(),
                RelationInvalidReasonEnum.BLOCKED == reason ? userA : null, eventTime);
        messageRecordDao.schedulePurgeByPair(low, high, eventTime);
        invalidateMatches(match == null ? List.of() : List.of(match.getId()), reason, eventTime);
    }

    private void invalidateMatches(List<Long> matchIds, RelationInvalidReasonEnum reason, LocalDateTime eventTime) {
        if (matchIds.isEmpty()) {
            return;
        }
        matchSourceDao.invalidateActiveByMatchIds(matchIds, reason.getCode(), eventTime);
        matchPopupDao.cancelPendingByMatchIds(matchIds, eventTime);
        matchDao.invalidateByIds(matchIds, reason.getCode(), eventTime);
    }

    private void require(Long userId, RelationInvalidReasonEnum reason) {
        if (userId == null || reason == null) {
            throw new BusinessException(RELATION_PARAM_ERROR, "关系失效用户和原因不能为空");
        }
    }

    private String conversationStatus(RelationInvalidReasonEnum reason) {
        return RelationInvalidReasonEnum.BLOCKED == reason
                ? MessageConversationStatusEnum.BLOCKED.getCode()
                : MessageConversationStatusEnum.INVALID.getCode();
    }
}

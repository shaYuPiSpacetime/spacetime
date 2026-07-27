package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppRelationMatchPopupDao;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.dao.AppRelationVisitCursorDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppRelationMatchPopup;
import com.spacetime.common.entity.AppRelationMatchSource;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.entity.AppRelationVisitCursor;
import com.spacetime.common.entity.AppRelationVisitEvent;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.enums.RelationMatchPopupActionEnum;
import com.spacetime.common.enums.RelationMatchPopupStatusEnum;
import com.spacetime.common.enums.RelationMatchSourceStatusEnum;
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import com.spacetime.common.enums.RelationMatchStatusEnum;
import com.spacetime.common.enums.RelationSourceSceneEnum;
import com.spacetime.common.enums.RelationVisitStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.RelationDomainService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Objects;

/** 公共关系领域状态机实现。 */
@Service
@RequiredArgsConstructor
public class RelationDomainServiceImpl implements RelationDomainService {
    /** 关系参数错误码。 */
    private static final int RELATION_PARAM_ERROR = 20008;
    /** 关系对象不存在错误码。 */
    private static final int RELATION_NOT_FOUND = 20009;

    private final AppRelationLikeDao likeDao;
    private final AppRelationVisitDao visitDao;
    private final AppRelationVisitEventDao visitEventDao;
    private final AppRelationVisitCursorDao visitCursorDao;
    private final AppRelationMatchDao matchDao;
    private final AppRelationMatchSourceDao matchSourceDao;
    private final AppRelationMatchPopupDao matchPopupDao;

    @Override
    @Transactional
    public AppRelationLike createLike(String requestId, Long fromUserId, Long toUserId,
                                      String sourceScene, LocalDateTime likedTime) {
        requireDistinctUsers(fromUserId, toUserId);
        requireText(requestId, "喜欢请求幂等键不能为空");
        requireSourceScene(sourceScene);
        LocalDateTime eventTime = timeOrNow(likedTime);

        AppRelationLike existing = findActiveLike(fromUserId, toUserId);
        if (existing != null) {
            return existing;
        }

        AppRelationLike like = new AppRelationLike();
        like.setLikeNo(businessNo("LIK"));
        like.setRequestId(requestId);
        like.setFromUserId(fromUserId);
        like.setToUserId(toUserId);
        like.setSourceScene(sourceScene);
        like.setLikeStatus(RelationLikeStatusEnum.ACTIVE.getCode());
        like.setActiveMarker(1);
        like.setLikedTime(eventTime);
        try {
            likeDao.insert(like);
        } catch (DuplicateKeyException ex) {
            AppRelationLike concurrent = findActiveLike(fromUserId, toUserId);
            if (concurrent != null) {
                return concurrent;
            }
            throw ex;
        }

        AppRelationLike reverse = findActiveLike(toUserId, fromUserId);
        if (reverse != null) {
            addMatchSource(fromUserId, toUserId, RelationMatchSourceTypeEnum.DOUBLE_LIKE.getCode(),
                    canonicalPairEvent(like.getLikeNo(), reverse.getLikeNo()), eventTime);
        }
        return like;
    }

    @Override
    @Transactional
    public void cancelLike(Long fromUserId, Long toUserId, LocalDateTime cancelledTime) {
        requireDistinctUsers(fromUserId, toUserId);
        AppRelationLike like = findActiveLike(fromUserId, toUserId);
        if (like == null) {
            return;
        }
        LocalDateTime eventTime = timeOrNow(cancelledTime);
        AppRelationLike reverse = findActiveLike(toUserId, fromUserId);
        likeDao.update(new LambdaUpdateWrapper<AppRelationLike>()
                .eq(AppRelationLike::getId, like.getId())
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                .eq(AppRelationLike::getActiveMarker, 1)
                .set(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.CANCELLED.getCode())
                .set(AppRelationLike::getActiveMarker, null)
                .set(AppRelationLike::getCancelledTime, eventTime)
                .set(AppRelationLike::getInvalidReason, RelationInvalidReasonEnum.LIKE_CANCELLED.getCode())
                .set(AppRelationLike::getInvalidTime, eventTime));
        if (reverse != null) {
            revokeMatchSource(RelationMatchSourceTypeEnum.DOUBLE_LIKE.getCode(),
                    canonicalPairEvent(like.getLikeNo(), reverse.getLikeNo()),
                    RelationInvalidReasonEnum.LIKE_CANCELLED, eventTime);
        }
    }

    @Override
    @Transactional
    public AppRelationVisit recordVisit(String eventNo, Long visitorUserId, Long targetUserId,
                                        String sourceScene, LocalDateTime visitTime) {
        requireDistinctUsers(visitorUserId, targetUserId);
        requireText(eventNo, "访问事件幂等号不能为空");
        requireSourceScene(sourceScene);
        LocalDateTime eventTime = timeOrNow(visitTime);

        AppRelationVisitEvent duplicate = findVisitEvent(eventNo);
        if (duplicate != null) {
            return duplicateVisit(duplicate, visitorUserId, targetUserId);
        }

        AppRelationVisitEvent event = new AppRelationVisitEvent();
        event.setEventNo(eventNo);
        event.setVisitorUserId(visitorUserId);
        event.setTargetUserId(targetUserId);
        event.setSourceScene(sourceScene);
        event.setVisitTime(eventTime);
        try {
            visitEventDao.insert(event);
        } catch (DuplicateKeyException ex) {
            AppRelationVisitEvent concurrent = findVisitEvent(eventNo);
            if (concurrent != null) {
                return duplicateVisit(concurrent, visitorUserId, targetUserId);
            }
            throw ex;
        }

        AppRelationVisitCursor cursor = lockOrCreateCursor(visitorUserId, targetUserId);
        AppRelationVisit current = cursor.getCurrentVisitId() == null
                ? null : visitDao.selectById(cursor.getCurrentVisitId());
        boolean merge = current != null
                && RelationVisitStatusEnum.VISIBLE.getCode().equals(current.getVisitStatus())
                && cursor.getLastVisitTime() != null
                && eventTime.isBefore(cursor.getLastVisitTime().plusMinutes(30));

        AppRelationVisit visit;
        if (merge) {
            visit = current;
            visit.setPvCount((visit.getPvCount() == null ? 0 : visit.getPvCount()) + 1);
            visit.setLastVisitTime(eventTime);
            // 展示记录保留首次来源，精确来源始终在 event 表中追溯。
            visitDao.updateById(visit);
        } else {
            visit = new AppRelationVisit();
            visit.setVisitNo(businessNo("VIS"));
            visit.setVisitorUserId(visitorUserId);
            visit.setTargetUserId(targetUserId);
            visit.setSourceScene(sourceScene);
            visit.setVisitStatus(RelationVisitStatusEnum.VISIBLE.getCode());
            visit.setFirstVisitTime(eventTime);
            visit.setLastVisitTime(eventTime);
            visit.setPvCount(1);
            visitDao.insert(visit);
        }

        event.setVisitId(visit.getId());
        visitEventDao.updateById(event);
        cursor.setCurrentVisitId(visit.getId());
        cursor.setLastVisitTime(eventTime);
        visitCursorDao.updateById(cursor);
        return visit;
    }

    @Override
    @Transactional
    public AppRelationMatch addMatchSource(Long userA, Long userB, String sourceType,
                                           String sourceEventNo, LocalDateTime effectiveTime) {
        requireDistinctUsers(userA, userB);
        requireMatchSourceType(sourceType);
        requireText(sourceEventNo, "匹配来源事件号不能为空");
        AppRelationMatchSource duplicate = findMatchSource(sourceType, sourceEventNo);
        if (duplicate != null) {
            return requireMatch(duplicate.getMatchId());
        }

        Long low = Math.min(userA, userB);
        Long high = Math.max(userA, userB);
        LocalDateTime eventTime = timeOrNow(effectiveTime);
        AppRelationMatch match = matchDao.selectActivePairForUpdate(low, high);
        boolean newLifecycle = match == null;
        if (newLifecycle) {
            match = new AppRelationMatch();
            match.setMatchNo(businessNo("MAT"));
            match.setUserLowId(low);
            match.setUserHighId(high);
            match.setPrimarySource(sourceType);
            match.setMatchStatus(RelationMatchStatusEnum.MATCHED.getCode());
            match.setActiveMarker(1);
            match.setMatchedTime(eventTime);
            try {
                matchDao.insert(match);
            } catch (DuplicateKeyException ex) {
                match = matchDao.selectActivePairForUpdate(low, high);
                if (match == null) {
                    throw ex;
                }
                newLifecycle = false;
            }
        }

        AppRelationMatchSource source = new AppRelationMatchSource();
        source.setSourceNo(businessNo("MTS"));
        source.setMatchId(match.getId());
        source.setSourceType(sourceType);
        source.setSourceEventNo(sourceEventNo);
        source.setSourceStatus(RelationMatchSourceStatusEnum.ACTIVE.getCode());
        source.setEffectiveTime(eventTime);
        try {
            matchSourceDao.insert(source);
        } catch (DuplicateKeyException ex) {
            AppRelationMatchSource concurrent = findMatchSource(sourceType, sourceEventNo);
            if (concurrent == null) {
                throw ex;
            }
            return requireMatch(concurrent.getMatchId());
        }

        if (newLifecycle) {
            createPopup(match, low);
            createPopup(match, high);
        }
        return match;
    }

    @Override
    @Transactional
    public void revokeMatchSource(String sourceType, String sourceEventNo,
                                  RelationInvalidReasonEnum reason, LocalDateTime revokedTime) {
        requireMatchSourceType(sourceType);
        requireText(sourceEventNo, "匹配来源事件号不能为空");
        if (reason == null) {
            throw new BusinessException(RELATION_PARAM_ERROR, "匹配来源撤销原因不能为空");
        }
        AppRelationMatchSource source = findMatchSource(sourceType, sourceEventNo);
        if (source == null || !RelationMatchSourceStatusEnum.ACTIVE.getCode().equals(source.getSourceStatus())) {
            return;
        }
        AppRelationMatch match = matchDao.selectByIdForUpdate(source.getMatchId());
        if (match == null) {
            throw new BusinessException(RELATION_NOT_FOUND, "匹配关系不存在");
        }
        source = matchSourceDao.selectByIdForUpdate(source.getId());
        if (source == null || !RelationMatchSourceStatusEnum.ACTIVE.getCode().equals(source.getSourceStatus())) {
            return;
        }
        LocalDateTime eventTime = timeOrNow(revokedTime);
        source.setSourceStatus(RelationMatchSourceStatusEnum.REVOKED.getCode());
        source.setRevokedTime(eventTime);
        source.setInvalidReason(reason.getCode());
        matchSourceDao.updateById(source);

        long activeCount = matchSourceDao.count(new LambdaQueryWrapper<AppRelationMatchSource>()
                .eq(AppRelationMatchSource::getMatchId, source.getMatchId())
                .eq(AppRelationMatchSource::getSourceStatus, RelationMatchSourceStatusEnum.ACTIVE.getCode()));
        if (activeCount > 0) {
            return;
        }

        if (RelationMatchStatusEnum.MATCHED.getCode().equals(match.getMatchStatus())) {
            matchDao.update(new LambdaUpdateWrapper<AppRelationMatch>()
                    .eq(AppRelationMatch::getId, match.getId())
                    .eq(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.MATCHED.getCode())
                    .eq(AppRelationMatch::getActiveMarker, 1)
                    .set(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.INVALID.getCode())
                    .set(AppRelationMatch::getActiveMarker, null)
                    .set(AppRelationMatch::getInvalidReason, reason.getCode())
                    .set(AppRelationMatch::getInvalidTime, eventTime));
            cancelPendingPopups(match.getId(), eventTime);
        }
    }

    @Override
    @Transactional
    public void markPopupDelivered(String matchNo, Long userId, LocalDateTime deliveredTime) {
        AppRelationMatchPopup popup = requirePopup(matchNo, userId);
        if (RelationMatchPopupStatusEnum.PENDING.getCode().equals(popup.getPopupStatus())) {
            popup.setDeliveredTime(timeOrNow(deliveredTime));
            matchPopupDao.updateById(popup);
        }
    }

    @Override
    @Transactional
    public void markPopupRead(String matchNo, Long userId, String action, LocalDateTime readTime) {
        requirePopupAction(action);
        AppRelationMatchPopup popup = requirePopup(matchNo, userId);
        if (RelationMatchPopupStatusEnum.PENDING.getCode().equals(popup.getPopupStatus())) {
            popup.setPopupStatus(RelationMatchPopupStatusEnum.READ.getCode());
            popup.setReadAction(action);
            popup.setReadTime(timeOrNow(readTime));
            matchPopupDao.updateById(popup);
        }
    }

    private AppRelationVisitCursor lockOrCreateCursor(Long visitorUserId, Long targetUserId) {
        AppRelationVisitCursor cursor = visitCursorDao.selectPairForUpdate(visitorUserId, targetUserId);
        if (cursor != null) {
            return cursor;
        }
        AppRelationVisitCursor created = new AppRelationVisitCursor();
        created.setVisitorUserId(visitorUserId);
        created.setTargetUserId(targetUserId);
        try {
            visitCursorDao.insert(created);
        } catch (DuplicateKeyException ignored) {
            // 并发请求已创建游标，随后重新加锁读取同一行。
        }
        AppRelationVisitCursor locked = visitCursorDao.selectPairForUpdate(visitorUserId, targetUserId);
        return locked == null ? created : locked;
    }

    private void createPopup(AppRelationMatch match, Long userId) {
        AppRelationMatchPopup popup = new AppRelationMatchPopup();
        popup.setMatchId(match.getId());
        popup.setMatchNo(match.getMatchNo());
        popup.setUserId(userId);
        popup.setPopupStatus(RelationMatchPopupStatusEnum.PENDING.getCode());
        matchPopupDao.insert(popup);
    }

    private void cancelPendingPopups(Long matchId, LocalDateTime eventTime) {
        matchPopupDao.cancelPendingByMatchId(matchId, eventTime);
    }

    private AppRelationLike findActiveLike(Long fromUserId, Long toUserId) {
        return likeDao.selectOne(new LambdaQueryWrapper<AppRelationLike>()
                .eq(AppRelationLike::getFromUserId, fromUserId)
                .eq(AppRelationLike::getToUserId, toUserId)
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                .eq(AppRelationLike::getActiveMarker, 1));
    }

    private AppRelationVisitEvent findVisitEvent(String eventNo) {
        return visitEventDao.selectOne(new LambdaQueryWrapper<AppRelationVisitEvent>()
                .eq(AppRelationVisitEvent::getEventNo, eventNo));
    }

    private AppRelationVisit duplicateVisit(AppRelationVisitEvent event, Long visitorUserId, Long targetUserId) {
        if (!Objects.equals(event.getVisitorUserId(), visitorUserId)
                || !Objects.equals(event.getTargetUserId(), targetUserId)) {
            throw new BusinessException(RELATION_PARAM_ERROR, "访问事件幂等号已被其他用户关系占用");
        }
        return requireVisit(event.getVisitId());
    }

    private AppRelationMatchSource findMatchSource(String sourceType, String sourceEventNo) {
        return matchSourceDao.selectOne(new LambdaQueryWrapper<AppRelationMatchSource>()
                .eq(AppRelationMatchSource::getSourceType, sourceType)
                .eq(AppRelationMatchSource::getSourceEventNo, sourceEventNo));
    }

    private AppRelationMatchPopup requirePopup(String matchNo, Long userId) {
        requireText(matchNo, "匹配编号不能为空");
        if (userId == null) {
            throw new BusinessException(RELATION_PARAM_ERROR, "弹窗用户不能为空");
        }
        AppRelationMatchPopup popup = matchPopupDao.selectOne(new LambdaQueryWrapper<AppRelationMatchPopup>()
                .eq(AppRelationMatchPopup::getMatchNo, matchNo)
                .eq(AppRelationMatchPopup::getUserId, userId));
        if (popup == null) {
            throw new BusinessException(RELATION_NOT_FOUND, "匹配弹窗不存在");
        }
        return popup;
    }

    private AppRelationVisit requireVisit(Long visitId) {
        AppRelationVisit visit = visitId == null ? null : visitDao.selectById(visitId);
        if (visit == null) {
            throw new BusinessException(RELATION_NOT_FOUND, "访客展示记录不存在");
        }
        return visit;
    }

    private AppRelationMatch requireMatch(Long matchId) {
        AppRelationMatch match = matchId == null ? null : matchDao.selectById(matchId);
        if (match == null) {
            throw new BusinessException(RELATION_NOT_FOUND, "匹配生命周期不存在");
        }
        return match;
    }

    private void requireDistinctUsers(Long userA, Long userB) {
        if (userA == null || userB == null || userA.equals(userB)) {
            throw new BusinessException(RELATION_PARAM_ERROR, "关系双方用户不能为空且不能相同");
        }
    }

    private void requireSourceScene(String sourceScene) {
        boolean valid = Arrays.stream(RelationSourceSceneEnum.values())
                .anyMatch(value -> value.getCode().equals(sourceScene));
        if (!valid) {
            throw new BusinessException(RELATION_PARAM_ERROR, "不支持的关系来源");
        }
    }

    private void requireMatchSourceType(String sourceType) {
        boolean valid = Arrays.stream(RelationMatchSourceTypeEnum.values())
                .anyMatch(value -> value.getCode().equals(sourceType));
        if (!valid) {
            throw new BusinessException(RELATION_PARAM_ERROR, "不支持的匹配来源");
        }
    }

    private void requirePopupAction(String action) {
        boolean valid = Arrays.stream(RelationMatchPopupActionEnum.values())
                .anyMatch(value -> value.getCode().equals(action));
        if (!valid) {
            throw new BusinessException(RELATION_PARAM_ERROR, "不支持的匹配弹窗动作");
        }
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(RELATION_PARAM_ERROR, message);
        }
    }

    private String canonicalPairEvent(String left, String right) {
        return Arrays.stream(new String[]{left, right})
                .sorted(Comparator.naturalOrder())
                .reduce((a, b) -> a + "|" + b)
                .orElseThrow();
    }

    private String businessNo(String prefix) {
        return prefix + "-" + IdUtil.fastSimpleUUID().toUpperCase();
    }

    private LocalDateTime timeOrNow(LocalDateTime value) {
        return value == null ? LocalDateTime.now() : value;
    }
}

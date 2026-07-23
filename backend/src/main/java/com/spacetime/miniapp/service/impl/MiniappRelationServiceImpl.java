package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationLikeInboxStateDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppRelationMatchPopupDao;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dto.RelationLikeListRow;
import com.spacetime.common.dto.RelationVisitListRow;
import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationLikeInboxState;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppRelationMatchPopup;
import com.spacetime.common.entity.AppRelationMatchSource;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.entity.AppRelationVisitEvent;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.enums.RelationMatchPopupStatusEnum;
import com.spacetime.common.enums.RelationMatchSourceStatusEnum;
import com.spacetime.common.enums.RelationMatchStatusEnum;
import com.spacetime.common.enums.RelationVisitStatusEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.MiniappPresenceService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.RelationDomainService;
import com.spacetime.miniapp.dto.request.LikesMeReadReq;
import com.spacetime.miniapp.dto.request.MatchPopupReadReq;
import com.spacetime.miniapp.dto.request.RelationLikeCreateReq;
import com.spacetime.miniapp.dto.request.RelationVisitCreateReq;
import com.spacetime.miniapp.dto.response.LikesMeAvatarPreviewVO;
import com.spacetime.miniapp.dto.response.LikesMeItemVO;
import com.spacetime.miniapp.dto.response.LikesMePageVO;
import com.spacetime.miniapp.dto.response.MatchPopupVO;
import com.spacetime.miniapp.dto.response.MutualMatchItemVO;
import com.spacetime.miniapp.dto.response.MutualMatchPageVO;
import com.spacetime.miniapp.dto.response.RecentViewerItemVO;
import com.spacetime.miniapp.dto.response.RecentViewersPageVO;
import com.spacetime.miniapp.dto.response.RelationLikeActionVO;
import com.spacetime.miniapp.dto.response.RelationVisitActionVO;
import com.spacetime.miniapp.service.MiniappRelationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** PRD-02 移动端关系反馈查询与动作编排。 */
@Service
@RequiredArgsConstructor
public class MiniappRelationServiceImpl implements MiniappRelationService {
    private static final int CURRENT_ACCESS_CLOSED = 20001;
    private static final int TARGET_UNAVAILABLE = 20002;
    private static final int ACTIVE_LIKE_EXISTS = 20004;
    private static final int PARAM_ERROR = 4001;
    private static final int VISIBLE_DAYS = 7;
    private static final int ORDINARY_LIKE_LIMIT = 10;
    private static final int MOBILE_PAGE_SIZE = 20;
    private static final int NEW_LIKE_PREVIEW_LIMIT = 5;
    private static final String CURSOR_VERSION = "1";
    private static final String CURSOR_EMPTY = "~";
    private static final String DISPLAY_BLUR = "blur";
    private static final String DISPLAY_CLEAR = "clear";

    private final AppUserDao appUserDao;
    private final AppRelationLikeDao likeDao;
    private final AppRelationLikeInboxStateDao likeInboxStateDao;
    private final AppRelationVisitDao visitDao;
    private final AppRelationVisitEventDao visitEventDao;
    private final AppRelationMatchDao matchDao;
    private final AppRelationMatchSourceDao matchSourceDao;
    private final AppRelationMatchPopupDao matchPopupDao;
    private final UserAssetDao userAssetDao;
    private final RelationDomainService relationDomainService;
    private final RelationAccessProjectionService accessProjectionService;
    private final AppUserAuditContentService auditContentService;
    private final ProfileDictionaryService profileDictionaryService;
    private final MiniappPresenceService presenceService;

    @Override
    public LikesMePageVO likesMe(Long userId, int page, int size, String snapshotCursor) {
        AppUser currentUser = requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        LocalDateTime now = LocalDateTime.now();
        boolean vip = isVipActive(userAssetDao.selectByUserId(userId), now);
        int current = Math.max(page, 1);
        int effectiveSize = Math.min(Math.max(size, 1), MOBILE_PAGE_SIZE);
        LikesMeSnapshot snapshot = resolveLikesMeSnapshot(userId, snapshotCursor);

        if (snapshot.snapshotLikedTime() == null || snapshot.snapshotLikeId() == null) {
            return emptyLikesMePage(current, effectiveSize, vip);
        }

        long total = likeDao.count(incomingActiveLikesAtSnapshot(userId, snapshot));
        long newCount = likeDao.count(newIncomingActiveLikesAtSnapshot(userId, snapshot));
        long visibleTotal = likeDao.countVisibleIncomingLikes(
                userId, vip, snapshot.snapshotLikedTime(), snapshot.snapshotLikeId());
        long offset = (long) (current - 1) * effectiveSize;
        List<RelationLikeListRow> rows = safeList(likeDao.selectVisibleIncomingLikes(
                userId, vip,
                snapshot.lastReadLikedTime(), snapshot.lastReadLikeId(),
                snapshot.snapshotLikedTime(), snapshot.snapshotLikeId(),
                offset, effectiveSize));
        List<RelationLikeListRow> previews = safeList(likeDao.selectNewIncomingLikePreviews(
                userId,
                snapshot.lastReadLikedTime(), snapshot.lastReadLikeId(),
                snapshot.snapshotLikedTime(), snapshot.snapshotLikeId(),
                NEW_LIKE_PREVIEW_LIMIT));

        LinkedHashSet<Long> targetUserIds = new LinkedHashSet<>();
        rows.stream().map(RelationLikeListRow::getFromUserId)
                .filter(Objects::nonNull).forEach(targetUserIds::add);
        previews.stream().map(RelationLikeListRow::getFromUserId)
                .filter(Objects::nonNull).forEach(targetUserIds::add);
        Map<Long, AppUser> users = loadUsers(targetUserIds);
        ProfileLabels profileLabels = profileLabels(users.values());
        Map<Long, LocalDateTime> fallbackActiveTimes = new LinkedHashMap<>();
        users.values().forEach(user -> fallbackActiveTimes.put(user.getId(), user.getLastLoginTime()));
        Map<Long, MiniappPresenceService.PresenceSnapshot> resolvedPresence =
                presenceService.resolve(fallbackActiveTimes, now);
        Map<Long, MiniappPresenceService.PresenceSnapshot> presence =
                resolvedPresence == null ? Map.of() : resolvedPresence;
        Map<Long, AppRelationMatch> matches = activeMatchesByCounterparty(userId);
        Map<Long, String> avatars = publicAvatars(targetUserIds);

        List<LikesMeItemVO> records = rows.stream()
                .filter(row -> users.containsKey(row.getFromUserId()))
                .map(row -> toLikeItem(row, currentUser, users.get(row.getFromUserId()),
                        vip || row.getUnlockTime() != null,
                        matches.containsKey(row.getFromUserId()), avatars.get(row.getFromUserId()),
                        presence.get(row.getFromUserId()), profileLabels))
                .toList();
        List<LikesMeAvatarPreviewVO> previewItems = previews.stream()
                .map(row -> toLikePreview(row, vip || row.getUnlockTime() != null,
                        avatars.get(row.getFromUserId()), presence.get(row.getFromUserId())))
                .toList();
        boolean containsUnlocked = rows.stream().anyMatch(row -> row.getUnlockTime() != null)
                || previews.stream().anyMatch(row -> row.getUnlockTime() != null)
                || visibleTotal > Math.min(total, ORDINARY_LIKE_LIMIT);

        LikesMePageVO result = new LikesMePageVO();
        result.setCurrent((long) current);
        result.setSize((long) effectiveSize);
        result.setTotal(total);
        result.setNewCount(newCount);
        result.setVisibleTotal(visibleTotal);
        result.setHiddenCount(Math.max(total - visibleTotal, 0L));
        result.setPages(pages(visibleTotal, effectiveSize));
        result.setReadCursor(encodeSnapshot(snapshot));
        result.setNewLikePreviewAvatars(previewItems);
        result.setAccessMode(vip ? "VIP_ALL_CLEAR" : containsUnlocked ? "MIXED" : "BLUR_LIMIT");
        result.setHasMore((long) current * effectiveSize < visibleTotal);
        result.setRecords(records);
        return result;
    }

    /** 保留服务实现类的旧调用入口，已有内部调用会自动使用新快照规则。 */
    public LikesMePageVO likesMe(Long userId, int page, int size) {
        return likesMe(userId, page, size, null);
    }

    @Override
    @Transactional
    public void confirmLikesMeRead(Long userId, LikesMeReadReq req) {
        requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        LikesMeSnapshot snapshot = decodeSnapshot(req == null ? null : req.getReadCursor(), userId);
        validateSnapshotUpperBound(snapshot);
        LocalDateTime readAt = LocalDateTime.now();
        int inserted = likeInboxStateDao.insertIgnore(
                userId, snapshot.snapshotLikedTime(), snapshot.snapshotLikeId(), readAt);
        if (inserted == 0) {
            likeInboxStateDao.advance(
                    userId, snapshot.snapshotLikedTime(), snapshot.snapshotLikeId(), readAt);
        }
    }

    @Override
    public RecentViewersPageVO recentViewers(Long userId, int page, int size) {
        AppUser currentUser = requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sevenDayStart = now.minusDays(VISIBLE_DAYS);
        boolean vip = isVipActive(userAssetDao.selectByUserId(userId), now);
        int current = Math.max(page, 1);
        int effectiveSize = Math.min(Math.max(size, 1), MOBILE_PAGE_SIZE);
        long total = visitDao.countRecentVisitors(userId, sevenDayStart);
        long visibleTotal = visitDao.countVisibleRecentVisitors(userId, vip, sevenDayStart);
        long unlockedTotal = vip ? total : visitDao.countUnlockedRecentVisitors(userId, sevenDayStart);
        long offset = (long) (current - 1) * effectiveSize;
        List<RelationVisitListRow> sourceRows = safeList(visitDao.selectVisibleRecentVisitors(
                userId, vip, sevenDayStart, offset, effectiveSize));
        LinkedHashSet<Long> visitorUserIds = sourceRows.stream()
                .map(RelationVisitListRow::getVisitorUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, AppUser> users = loadUsers(visitorUserIds);
        Set<Long> openUserIds = openUserIds(users);
        List<RelationVisitListRow> rows = sourceRows.stream()
                .filter(row -> openUserIds.contains(row.getVisitorUserId()))
                .toList();
        ProfileLabels profileLabels = profileLabels(users.values());
        Map<Long, LocalDateTime> fallbackActiveTimes = new LinkedHashMap<>();
        users.values().forEach(user -> fallbackActiveTimes.put(user.getId(), user.getLastLoginTime()));
        Map<Long, MiniappPresenceService.PresenceSnapshot> resolvedPresence =
                presenceService.resolve(fallbackActiveTimes, now);
        Map<Long, MiniappPresenceService.PresenceSnapshot> presence =
                resolvedPresence == null ? Map.of() : resolvedPresence;
        Map<Long, AppRelationMatch> matches = activeMatchesByCounterparty(userId);
        Map<Long, String> avatars = publicAvatars(visitorUserIds);
        LocalDate today = now.toLocalDate();

        List<RecentViewerItemVO> records = rows.stream()
                .map(row -> toVisitItem(row, currentUser, users.get(row.getVisitorUserId()),
                        vip || row.getUnlockTime() != null,
                        matches.containsKey(row.getVisitorUserId()), avatars.get(row.getVisitorUserId()),
                        presence.get(row.getVisitorUserId()), profileLabels, today))
                .toList();

        RelationVisitStats allTime = stats(userId, LocalDateTime.of(1970, 1, 1, 0, 0));
        RelationVisitStats sevenDays = stats(userId, sevenDayStart);
        RelationVisitStats todayStats = stats(userId, LocalDateTime.of(today, LocalTime.MIN));
        RecentViewersPageVO result = new RecentViewersPageVO();
        result.setCurrent((long) current);
        result.setSize((long) effectiveSize);
        result.setTotal(total);
        result.setVisibleTotal(visibleTotal);
        result.setHiddenCount(Math.max(total - visibleTotal, 0L));
        result.setPages(pages(visibleTotal, effectiveSize));
        result.setAccessMode(vip ? "VIP_ALL_CLEAR" : unlockedTotal > 0 ? "MIXED" : "BLUR_LIMIT");
        result.setHasMore((long) current * effectiveSize < visibleTotal);
        result.setVisibleDays(VISIBLE_DAYS);
        result.setTotalPv(value(allTime.getPv()));
        result.setVisitorUv7d(value(sevenDays.getUv()));
        result.setVisitorPv7d(value(sevenDays.getPv()));
        result.setTodayVisitorUv(value(todayStats.getUv()));
        result.setTodayVisitPv(value(todayStats.getPv()));
        result.setRecords(records);
        return result;
    }

    @Override
    public MutualMatchPageVO mutualMatches(Long userId, int page, int size) {
        requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        int current = Math.max(page, 1);
        int effectiveSize = Math.min(Math.max(size, 1), MOBILE_PAGE_SIZE);
        LambdaQueryWrapper<AppRelationMatch> wrapper = new LambdaQueryWrapper<AppRelationMatch>()
                .eq(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.MATCHED.getCode())
                .eq(AppRelationMatch::getActiveMarker, 1)
                .and(query -> query.eq(AppRelationMatch::getUserLowId, userId)
                        .or().eq(AppRelationMatch::getUserHighId, userId))
                .orderByDesc(AppRelationMatch::getMatchedTime)
                .orderByDesc(AppRelationMatch::getId);
        Page<AppRelationMatch> source = matchDao.selectPage(new Page<>(current, effectiveSize), wrapper);
        List<AppRelationMatch> sourceRows = safeList(source.getRecords());
        Map<Long, Long> counterparties = sourceRows.stream().collect(Collectors.toMap(
                AppRelationMatch::getId, row -> counterparty(row, userId), (left, right) -> left));
        Map<Long, AppUser> users = loadUsers(counterparties.values());
        Set<Long> openUserIds = openUserIds(users);
        List<AppRelationMatch> rows = sourceRows.stream()
                .filter(row -> openUserIds.contains(counterparties.get(row.getId())))
                .toList();
        Map<Long, List<String>> sources = activeSources(rows.stream().map(AppRelationMatch::getId).toList());
        Map<Long, String> avatars = publicAvatars(rows.stream()
                .map(row -> counterparties.get(row.getId())).toList());

        List<MutualMatchItemVO> records = rows.stream()
                .map(row -> toMatchItem(row, users.get(counterparties.get(row.getId())),
                        sources.getOrDefault(row.getId(), List.of()),
                        avatars.get(counterparties.get(row.getId()))))
                .toList();
        long total = source.getTotal();
        MutualMatchPageVO result = new MutualMatchPageVO();
        result.setCurrent((long) current);
        result.setSize((long) effectiveSize);
        result.setTotal(total);
        result.setPages(pages(total, effectiveSize));
        result.setHasMore((long) current * effectiveSize < total);
        result.setRecords(records);
        return result;
    }

    @Override
    @Transactional
    public RelationLikeActionVO createLike(Long userId, RelationLikeCreateReq req) {
        AppUser current = requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        AppUser target = requireOpenUser(req.getTargetUserId(), TARGET_UNAVAILABLE, "目标用户当前不可互动");
        requireRelationshipPair(current, target);

        AppRelationLike sameRequest = likeDao.selectOne(new LambdaQueryWrapper<AppRelationLike>()
                .eq(AppRelationLike::getFromUserId, userId)
                .eq(AppRelationLike::getRequestId, req.getRequestId()));
        if (sameRequest != null) {
            if (!Objects.equals(sameRequest.getToUserId(), req.getTargetUserId())) {
                throw new BusinessException(PARAM_ERROR, "喜欢请求幂等键已被其他目标占用");
            }
            return likeAction(sameRequest, activeMatch(userId, req.getTargetUserId()));
        }
        AppRelationLike active = likeDao.selectOne(new LambdaQueryWrapper<AppRelationLike>()
                .eq(AppRelationLike::getFromUserId, userId)
                .eq(AppRelationLike::getToUserId, req.getTargetUserId())
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                .eq(AppRelationLike::getActiveMarker, 1));
        if (active != null) {
            throw new BusinessException(ACTIVE_LIKE_EXISTS, "已喜欢该用户，请勿重复操作");
        }
        AppRelationLike created = relationDomainService.createLike(req.getRequestId(), userId,
                req.getTargetUserId(), req.getSourceScene(), LocalDateTime.now());
        return likeAction(created, activeMatch(userId, req.getTargetUserId()));
    }

    @Override
    @Transactional
    public RelationLikeActionVO cancelLike(Long userId, Long targetUserId) {
        requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        AppUser target = appUserDao.selectById(targetUserId);
        if (target == null || Objects.equals(userId, targetUserId)) {
            throw new BusinessException(TARGET_UNAVAILABLE, "目标用户不存在");
        }
        relationDomainService.cancelLike(userId, targetUserId, LocalDateTime.now());
        AppRelationMatch match = activeMatch(userId, targetUserId);
        RelationLikeActionVO result = new RelationLikeActionVO();
        result.setLikeStatus(RelationLikeStatusEnum.CANCELLED.getCode());
        result.setMatched(match != null);
        result.setMatchNo(match == null ? null : match.getMatchNo());
        result.setMatchStatus(match == null ? RelationMatchStatusEnum.INVALID.getCode() : match.getMatchStatus());
        result.setCanEnterConversation(match != null);
        return result;
    }

    @Override
    @Transactional
    public RelationVisitActionVO recordVisit(Long userId, RelationVisitCreateReq req) {
        AppUser current = requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        AppUser target = requireOpenUser(req.getTargetUserId(), TARGET_UNAVAILABLE, "目标用户当前不可访问");
        requireRelationshipPair(current, target);
        AppRelationVisitEvent existingEvent = visitEventDao.selectOne(
                new LambdaQueryWrapper<AppRelationVisitEvent>().eq(AppRelationVisitEvent::getEventNo, req.getEventNo()));
        AppRelationVisit visit = relationDomainService.recordVisit(req.getEventNo(), userId,
                req.getTargetUserId(), req.getSourceScene(), LocalDateTime.now());
        RelationVisitActionVO result = new RelationVisitActionVO();
        result.setVisitNo(visit.getVisitNo());
        result.setDeduplicated(existingEvent != null || value(visit.getPvCount()) > 1);
        result.setVisitCount(value(visit.getPvCount()));
        result.setRecordedTime(visit.getLastVisitTime());
        return result;
    }

    @Override
    @Transactional
    public MatchPopupVO pendingPopup(Long userId) {
        requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        AppRelationMatchPopup popup = matchPopupDao.selectOne(new LambdaQueryWrapper<AppRelationMatchPopup>()
                .eq(AppRelationMatchPopup::getUserId, userId)
                .eq(AppRelationMatchPopup::getPopupStatus, RelationMatchPopupStatusEnum.PENDING.getCode())
                .orderByAsc(AppRelationMatchPopup::getCreateTime)
                .orderByAsc(AppRelationMatchPopup::getId)
                .last("LIMIT 1"));
        if (popup == null) {
            return null;
        }
        AppRelationMatch match = matchDao.selectById(popup.getMatchId());
        if (match == null || !RelationMatchStatusEnum.MATCHED.getCode().equals(match.getMatchStatus())) {
            return null;
        }
        Long targetUserId = counterparty(match, userId);
        AppUser target = appUserDao.selectById(targetUserId);
        if (target == null || !"OPEN".equals(accessProjectionService.project(target))) {
            return null;
        }
        relationDomainService.markPopupDelivered(match.getMatchNo(), userId, LocalDateTime.now());
        MatchPopupVO result = new MatchPopupVO();
        result.setMatchNo(match.getMatchNo());
        result.setMatchedUserId(targetUserId);
        result.setNickname(displayName(target));
        result.setAvatar(auditContentService.publicAvatar(targetUserId));
        result.setMatchSource(match.getPrimarySource());
        result.setMatchTime(match.getMatchedTime());
        result.setCanEnterConversation(true);
        result.setPopupStatus(RelationMatchPopupStatusEnum.PENDING.getCode());
        return result;
    }

    @Override
    @Transactional
    public void readPopup(Long userId, String matchNo, MatchPopupReadReq req) {
        requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        relationDomainService.markPopupRead(matchNo, userId, req.getAction(), LocalDateTime.now());
    }

    private LikesMeItemVO toLikeItem(RelationLikeListRow row, AppUser current, AppUser target,
                                     boolean clear, boolean mutual, String avatar,
                                     MiniappPresenceService.PresenceSnapshot presence,
                                     ProfileLabels labels) {
        LikesMeItemVO item = new LikesMeItemVO();
        item.setRecordNo(row.getLikeNo());
        item.setDisplayStatus(clear ? DISPLAY_CLEAR : DISPLAY_BLUR);
        item.setUserId(target.getId());
        item.setNickname(displayName(target));
        item.setAvatar(avatar);
        item.setAge(target.getAge());
        item.setSchool(target.getSchool());
        item.setOnlineStatus(presence == null ? "offline" : presence.onlineStatus());
        item.setLastActiveTime(presence == null ? target.getLastLoginTime() : presence.lastActiveTime());
        item.setOnlineText(presence == null ? "离线" : presence.onlineText());
        item.setIdentityCode(target.getIdentity());
        item.setIdentityLabel(profileLabel(labels.identity(), target.getIdentity()));
        item.setIndustryCode(target.getIndustry());
        item.setIndustryLabel(profileLabel(labels.industry(), target.getIndustry()));
        item.setOccupationCode(target.getOccupation());
        item.setOccupationLabel(profileLabel(labels.occupation(), target.getOccupation()));
        item.setCompany(target.getCompany());
        item.setAnnualIncomeCode(target.getAnnualIncome());
        item.setAnnualIncomeLabel(profileLabel(labels.annualIncome(), target.getAnnualIncome()));
        item.setWeakTags(weakTags(current, target));
        item.setSourceScene(row.getSourceScene());
        item.setIsNew(Boolean.TRUE.equals(row.getNewLike()));
        item.setGroupKey(Boolean.TRUE.equals(row.getNewLike())
                ? "new" : row.getUnlockTime() != null ? "earlier_unlocked" : "earlier_locked");
        item.setMutualLike(mutual);
        item.setLikedTime(row.getLikedTime());
        item.setUnlockTime(row.getUnlockTime());
        item.setLikeActionCopy("对你一见钟情，秒送喜欢");
        return item;
    }

    private LikesMeAvatarPreviewVO toLikePreview(
            RelationLikeListRow row,
            boolean clear,
            String avatar,
            MiniappPresenceService.PresenceSnapshot presence) {
        LikesMeAvatarPreviewVO preview = new LikesMeAvatarPreviewVO();
        preview.setRecordNo(row.getLikeNo());
        preview.setDisplayStatus(clear ? DISPLAY_CLEAR : DISPLAY_BLUR);
        preview.setAvatar(avatar);
        preview.setOnlineStatus(presence == null ? "offline" : presence.onlineStatus());
        return preview;
    }

    private ProfileLabels profileLabels(Collection<AppUser> users) {
        List<AppUser> values = users == null ? List.of() : users.stream().toList();
        return new ProfileLabels(
                profileDictionaryService.labels(ProfileDictType.IDENTITY,
                        values.stream().map(AppUser::getIdentity).toList()),
                profileDictionaryService.labels(ProfileDictType.INDUSTRY,
                        values.stream().map(AppUser::getIndustry).toList()),
                profileDictionaryService.labels(ProfileDictType.OCCUPATION,
                        values.stream().map(AppUser::getOccupation).toList()),
                profileDictionaryService.labels(ProfileDictType.ANNUAL_INCOME,
                        values.stream().map(AppUser::getAnnualIncome).toList()));
    }

    private String profileLabel(Map<String, String> labels, String code) {
        if (!StringUtils.hasText(code)) {
            return null;
        }
        return labels == null ? code : labels.getOrDefault(code, code);
    }

    private RecentViewerItemVO toVisitItem(
            RelationVisitListRow row,
            AppUser current,
            AppUser target,
            boolean clear,
            boolean mutual,
            String avatar,
            MiniappPresenceService.PresenceSnapshot presence,
            ProfileLabels labels,
            LocalDate today) {
        RecentViewerItemVO item = new RecentViewerItemVO();
        item.setRecordNo(row.getVisitNo());
        item.setDisplayStatus(clear ? DISPLAY_CLEAR : DISPLAY_BLUR);
        item.setUserId(target.getId());
        item.setNickname(displayName(target));
        item.setAvatar(avatar);
        item.setAge(target.getAge());
        item.setSchool(target.getSchool());
        item.setOnlineStatus(presence == null ? "offline" : presence.onlineStatus());
        item.setLastActiveTime(presence == null ? target.getLastLoginTime() : presence.lastActiveTime());
        item.setOnlineText(presence == null ? "离线" : presence.onlineText());
        item.setIdentityCode(target.getIdentity());
        item.setIdentityLabel(profileLabel(labels.identity(), target.getIdentity()));
        item.setIndustryCode(target.getIndustry());
        item.setIndustryLabel(profileLabel(labels.industry(), target.getIndustry()));
        item.setOccupationCode(target.getOccupation());
        item.setOccupationLabel(profileLabel(labels.occupation(), target.getOccupation()));
        item.setCompany(target.getCompany());
        item.setAnnualIncomeCode(target.getAnnualIncome());
        item.setAnnualIncomeLabel(profileLabel(labels.annualIncome(), target.getAnnualIncome()));
        item.setWeakTags(weakTags(current, target));
        item.setSourceScene(row.getSourceScene());
        item.setGroupKey(groupKey(row.getLastVisitTime(), today));
        item.setVisitCount(intValue(row.getVisitCount()));
        item.setFirstVisitTime(row.getFirstVisitTime());
        item.setLastVisitTime(row.getLastVisitTime());
        item.setUnlockTime(row.getUnlockTime());
        item.setMutualLike(mutual);
        item.setRelationBadges(mutual ? List.of("MUTUAL_LIKE") : List.of());
        return item;
    }

    private MutualMatchItemVO toMatchItem(AppRelationMatch row, AppUser target,
                                          List<String> activeSources, String avatar) {
        MutualMatchItemVO item = new MutualMatchItemVO();
        item.setMatchNo(row.getMatchNo());
        item.setUserId(target.getId());
        item.setNickname(displayName(target));
        item.setAvatar(avatar);
        item.setAge(target.getAge());
        item.setHeight(target.getHeight());
        item.setCurrentCity(target.getLocationCity());
        item.setHometownCity(target.getHometownCity());
        item.setPrimarySource(row.getPrimarySource());
        item.setActiveSources(activeSources);
        item.setMatchStatus(row.getMatchStatus());
        item.setMatchTime(row.getMatchedTime());
        item.setCanEnterConversation(true);
        return item;
    }

    private RelationLikeActionVO likeAction(AppRelationLike like, AppRelationMatch match) {
        RelationLikeActionVO result = new RelationLikeActionVO();
        result.setLikeNo(like.getLikeNo());
        result.setLikeStatus(like.getLikeStatus());
        result.setMatched(match != null);
        result.setMatchNo(match == null ? null : match.getMatchNo());
        result.setMatchStatus(match == null ? null : match.getMatchStatus());
        result.setCanEnterConversation(match != null);
        return result;
    }

    private AppUser requireOpenUser(Long userId, int errorCode, String message) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(errorCode, message);
        }
        return user;
    }

    private void requireRelationshipPair(AppUser current, AppUser target) {
        if (Objects.equals(current.getId(), target.getId())) {
            throw new BusinessException(TARGET_UNAVAILABLE, "不能与自己建立关系");
        }
        if (!StringUtils.hasText(current.getGender()) || !StringUtils.hasText(target.getGender())
                || current.getGender().equals(target.getGender())) {
            throw new BusinessException(TARGET_UNAVAILABLE, "目标用户不在当前关系范围");
        }
    }

    private LambdaQueryWrapper<AppRelationLike> incomingActiveLikes(Long userId) {
        return new LambdaQueryWrapper<AppRelationLike>()
                .eq(AppRelationLike::getToUserId, userId)
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                .eq(AppRelationLike::getActiveMarker, 1);
    }

    private LambdaQueryWrapper<AppRelationLike> incomingActiveLikesAtSnapshot(
            Long userId, LikesMeSnapshot snapshot) {
        return incomingActiveLikes(userId)
                .and(query -> query.lt(AppRelationLike::getLikedTime, snapshot.snapshotLikedTime())
                        .or(nested -> nested.eq(AppRelationLike::getLikedTime, snapshot.snapshotLikedTime())
                                .le(AppRelationLike::getId, snapshot.snapshotLikeId())));
    }

    private LambdaQueryWrapper<AppRelationLike> newIncomingActiveLikesAtSnapshot(
            Long userId, LikesMeSnapshot snapshot) {
        LambdaQueryWrapper<AppRelationLike> wrapper = incomingActiveLikesAtSnapshot(userId, snapshot);
        if (snapshot.lastReadLikedTime() == null) {
            return wrapper;
        }
        return wrapper.and(query -> query.gt(AppRelationLike::getLikedTime, snapshot.lastReadLikedTime())
                .or(nested -> nested.eq(AppRelationLike::getLikedTime, snapshot.lastReadLikedTime())
                        .gt(AppRelationLike::getId,
                                snapshot.lastReadLikeId() == null ? 0L : snapshot.lastReadLikeId())));
    }

    private LikesMeSnapshot resolveLikesMeSnapshot(Long userId, String snapshotCursor) {
        if (StringUtils.hasText(snapshotCursor)) {
            LikesMeSnapshot snapshot = decodeSnapshot(snapshotCursor, userId);
            validateSnapshotUpperBound(snapshot);
            return snapshot;
        }
        AppRelationLikeInboxState state = likeInboxStateDao.selectByUserId(userId);
        AppRelationLike latest = likeDao.selectOne(incomingActiveLikes(userId)
                .orderByDesc(AppRelationLike::getLikedTime)
                .orderByDesc(AppRelationLike::getId)
                .last("LIMIT 1"));
        return new LikesMeSnapshot(
                userId,
                state == null ? null : state.getLastReadLikedTime(),
                state == null ? null : state.getLastReadLikeId(),
                latest == null ? null : latest.getLikedTime(),
                latest == null ? null : latest.getId());
    }

    private void validateSnapshotUpperBound(LikesMeSnapshot snapshot) {
        if (snapshot.snapshotLikedTime() == null || snapshot.snapshotLikeId() == null) {
            throw new BusinessException(PARAM_ERROR, "喜欢列表读取游标无效");
        }
        AppRelationLike upper = likeDao.selectById(snapshot.snapshotLikeId());
        if (upper == null
                || !Objects.equals(upper.getToUserId(), snapshot.userId())
                || !Objects.equals(upper.getLikedTime(), snapshot.snapshotLikedTime())) {
            throw new BusinessException(PARAM_ERROR, "喜欢列表读取游标已失效");
        }
    }

    private String encodeSnapshot(LikesMeSnapshot snapshot) {
        String raw = String.join("|",
                CURSOR_VERSION,
                String.valueOf(snapshot.userId()),
                cursorTime(snapshot.lastReadLikedTime()),
                cursorId(snapshot.lastReadLikeId()),
                cursorTime(snapshot.snapshotLikedTime()),
                cursorId(snapshot.snapshotLikeId()));
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private LikesMeSnapshot decodeSnapshot(String cursor, Long userId) {
        if (!StringUtils.hasText(cursor) || cursor.length() > 2048) {
            throw new BusinessException(PARAM_ERROR, "喜欢列表读取游标无效");
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 6 || !CURSOR_VERSION.equals(parts[0])) {
                throw new IllegalArgumentException("unsupported cursor");
            }
            Long cursorUserId = Long.valueOf(parts[1]);
            if (!Objects.equals(cursorUserId, userId)) {
                throw new IllegalArgumentException("cursor owner mismatch");
            }
            LocalDateTime lastReadTime = parseCursorTime(parts[2]);
            Long lastReadId = parseCursorId(parts[3]);
            LocalDateTime snapshotTime = parseCursorTime(parts[4]);
            Long snapshotId = parseCursorId(parts[5]);
            if ((lastReadTime == null) != (lastReadId == null)
                    || snapshotTime == null || snapshotId == null || snapshotId <= 0) {
                throw new IllegalArgumentException("incomplete cursor");
            }
            return new LikesMeSnapshot(
                    cursorUserId, lastReadTime, lastReadId, snapshotTime, snapshotId);
        } catch (RuntimeException ex) {
            if (ex instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException(PARAM_ERROR, "喜欢列表读取游标无效");
        }
    }

    private String cursorTime(LocalDateTime value) {
        return value == null ? CURSOR_EMPTY : DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(value);
    }

    private String cursorId(Long value) {
        return value == null ? CURSOR_EMPTY : String.valueOf(value);
    }

    private LocalDateTime parseCursorTime(String value) {
        return CURSOR_EMPTY.equals(value)
                ? null : LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    private Long parseCursorId(String value) {
        return CURSOR_EMPTY.equals(value) ? null : Long.valueOf(value);
    }

    private LikesMePageVO emptyLikesMePage(int current, int size, boolean vip) {
        LikesMePageVO result = new LikesMePageVO();
        result.setCurrent((long) current);
        result.setSize((long) size);
        result.setTotal(0L);
        result.setNewCount(0L);
        result.setVisibleTotal(0L);
        result.setHiddenCount(0L);
        result.setPages(0L);
        result.setReadCursor(null);
        result.setNewLikePreviewAvatars(List.of());
        result.setAccessMode(vip ? "VIP_ALL_CLEAR" : "BLUR_LIMIT");
        result.setHasMore(false);
        result.setRecords(List.of());
        return result;
    }

    private Map<Long, AppUser> loadUsers(Collection<Long> userIds) {
        List<Long> ids = userIds == null ? List.of() : userIds.stream()
                .filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return safeList(appUserDao.selectList(new LambdaQueryWrapper<AppUser>().in(AppUser::getId, ids)))
                .stream().collect(Collectors.toMap(AppUser::getId, Function.identity(), (left, right) -> left));
    }

    private Set<Long> openUserIds(Map<Long, AppUser> users) {
        if (users.isEmpty()) {
            return Set.of();
        }
        Map<Long, String> projections = accessProjectionService.projectAll(users.values());
        if (projections == null || projections.isEmpty()) {
            return Set.of();
        }
        return users.keySet().stream()
                .filter(userId -> "OPEN".equals(projections.get(userId)))
                .collect(Collectors.toSet());
    }

    private Map<Long, AppRelationMatch> activeMatchesByCounterparty(Long userId) {
        return safeList(matchDao.selectActiveByUser(userId)).stream()
                .filter(match -> RelationMatchStatusEnum.MATCHED.getCode().equals(match.getMatchStatus()))
                .collect(Collectors.toMap(match -> counterparty(match, userId), Function.identity(),
                        (left, right) -> left));
    }

    private AppRelationMatch activeMatch(Long userA, Long userB) {
        return matchDao.selectActivePair(Math.min(userA, userB), Math.max(userA, userB));
    }

    private Map<Long, List<String>> activeSources(List<Long> matchIds) {
        if (matchIds.isEmpty()) {
            return Map.of();
        }
        return safeList(matchSourceDao.selectList(new LambdaQueryWrapper<AppRelationMatchSource>()
                .in(AppRelationMatchSource::getMatchId, matchIds)
                .eq(AppRelationMatchSource::getSourceStatus, RelationMatchSourceStatusEnum.ACTIVE.getCode())
                .orderByAsc(AppRelationMatchSource::getEffectiveTime)))
                .stream().collect(Collectors.groupingBy(AppRelationMatchSource::getMatchId,
                        Collectors.mapping(AppRelationMatchSource::getSourceType, Collectors.toList())));
    }

    private Map<Long, String> publicAvatars(Collection<Long> userIds) {
        List<Long> ids = userIds == null ? List.of() : userIds.stream()
                .filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> avatars = auditContentService.publicAvatars(ids);
        return avatars == null ? Map.of() : avatars;
    }

    private List<String> weakTags(AppUser current, AppUser target) {
        List<String> tags = new ArrayList<>();
        if (sameText(current.getLocationCity(), target.getLocationCity())) {
            tags.add("同城");
        }
        if (sameText(current.getHometownCity(), target.getHometownCity())) {
            tags.add("同乡");
        }
        if (StringUtils.hasText(target.getZodiac())) {
            tags.add(target.getZodiac());
        }
        return tags.stream().limit(2).toList();
    }

    private boolean sameText(String left, String right) {
        return StringUtils.hasText(left) && left.equals(right);
    }

    private boolean isVipActive(UserAsset asset, LocalDateTime now) {
        return asset != null && VipStatusEnum.ACTIVE.getCode().equals(asset.getVipStatus())
                && (asset.getVipExpireTime() == null || asset.getVipExpireTime().isAfter(now));
    }

    private RelationVisitStats stats(Long userId, LocalDateTime start) {
        RelationVisitStats stats = visitEventDao.countTargetStats(userId, start);
        return stats == null ? new RelationVisitStats(0L, 0L) : stats;
    }

    private Long counterparty(AppRelationMatch match, Long userId) {
        if (Objects.equals(match.getUserLowId(), userId)) {
            return match.getUserHighId();
        }
        if (Objects.equals(match.getUserHighId(), userId)) {
            return match.getUserLowId();
        }
        throw new BusinessException(TARGET_UNAVAILABLE, "匹配关系与当前用户不一致");
    }

    private String groupKey(LocalDateTime time, LocalDate today) {
        if (time == null) {
            return "recent7d";
        }
        LocalDate date = time.toLocalDate();
        if (today.equals(date)) {
            return "today";
        }
        return today.minusDays(1).equals(date) ? "yesterday" : "recent7d";
    }

    private String displayName(AppUser user) {
        return StringUtils.hasText(user.getNickname()) ? user.getNickname() : "成家号 " + user.getId();
    }

    private long pages(long total, int size) {
        return size <= 0 ? 0L : (total + size - 1) / size;
    }

    private long value(Long value) {
        return value == null ? 0L : value;
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private int intValue(Long value) {
        if (value == null || value <= 0) {
            return 0;
        }
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : value.intValue();
    }

    private <T> List<T> safeList(List<T> values) {
        return values == null ? Collections.emptyList() : values;
    }

    private record LikesMeSnapshot(
            Long userId,
            LocalDateTime lastReadLikedTime,
            Long lastReadLikeId,
            LocalDateTime snapshotLikedTime,
            Long snapshotLikeId) {
    }

    private record ProfileLabels(
            Map<String, String> identity,
            Map<String, String> industry,
            Map<String, String> occupation,
            Map<String, String> annualIncome) {
    }
}

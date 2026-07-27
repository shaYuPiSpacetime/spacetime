package com.spacetime.admin.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.RelationPageReq;
import com.spacetime.admin.dto.request.RelationUnlockPageReq;
import com.spacetime.admin.dto.response.AppUserRelationLikeVO;
import com.spacetime.admin.dto.response.AppUserRelationMatchVO;
import com.spacetime.admin.dto.response.AppUserRelationSummaryVO;
import com.spacetime.admin.dto.response.AppUserRelationUnlockVO;
import com.spacetime.admin.dto.response.AppUserRelationVisitVO;
import com.spacetime.admin.dto.response.RelationCounterpartyVO;
import com.spacetime.admin.service.AppUserRelationAdminService;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppRelationMatchSourceDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.dto.RelationViewAudit;
import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppRelationMatchSource;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.enums.RelationMatchSourceStatusEnum;
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import com.spacetime.common.enums.RelationMatchStatusEnum;
import com.spacetime.common.enums.RelationSourceSceneEnum;
import com.spacetime.common.enums.RelationVisitStatusEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.common.service.RelationAuditService;
import com.spacetime.common.util.DesensitizeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 管理后台 APP 用户关系反馈只读查询实现。 */
@Service
@RequiredArgsConstructor
public class AppUserRelationAdminServiceImpl implements AppUserRelationAdminService {
    private static final int RELATION_PARAM_ERROR = 20008;
    private static final int RELATION_NOT_FOUND = 20009;
    private static final Set<Integer> PAGE_SIZES = Set.of(5, 10, 20, 50);
    private static final Set<String> DIRECTIONS = Set.of("ALL", "OUTBOUND", "INBOUND");
    private static final String ALL_FILTER = "ALL";
    private static final String ASSET_PERMISSION = "commercial:user:view";

    private final AppUserDao appUserDao;
    private final AppRelationLikeDao likeDao;
    private final AppRelationVisitDao visitDao;
    private final AppRelationVisitEventDao visitEventDao;
    private final AppRelationMatchDao matchDao;
    private final AppRelationMatchSourceDao matchSourceDao;
    private final UserUnlockRecordDao unlockRecordDao;
    private final UserAssetDao userAssetDao;
    private final AppUserAuditContentService auditContentService;
    private final RelationAccessProjectionService accessProjectionService;
    private final RelationAuditService relationAuditService;

    @Override
    public AppUserRelationSummaryVO summary(Long userId) {
        AppUser user = requireUser(userId);
        boolean assetVisible = hasAssetPermission();
        AppUserRelationSummaryVO vo = new AppUserRelationSummaryVO();
        vo.setUserId(userId);
        vo.setRelationshipAccess(accessProjectionService.project(user));
        vo.setVipVisible(assetVisible);
        if (assetVisible) {
            vo.setVipStatus(effectiveVipStatus(userAssetDao.selectByUserId(userId)));
        }
        vo.setActiveLikedCount(likeDao.count(new LambdaQueryWrapper<AppRelationLike>()
                .eq(AppRelationLike::getToUserId, userId)
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())));
        RelationVisitStats visitStats = visitEventDao.countTargetStats(userId, LocalDateTime.now().minusDays(7));
        vo.setVisitorUv7d(visitStats == null || visitStats.getUv() == null ? 0L : visitStats.getUv());
        vo.setVisitorPv7d(visitStats == null || visitStats.getPv() == null ? 0L : visitStats.getPv());
        vo.setActiveMutualCount(matchDao.count(matchWrapper(userId)
                .eq(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.MATCHED.getCode())));
        AppRelationMatch latestMatch = matchDao.selectOne(matchWrapper(userId)
                .orderByDesc(AppRelationMatch::getMatchedTime)
                .orderByDesc(AppRelationMatch::getId)
                .last("LIMIT 1"));
        vo.setLastMatchTime(latestMatch == null ? null : latestMatch.getMatchedTime());
        audit(userId, "summary", null, 1L, assetVisible);
        return vo;
    }

    @Override
    public Page<AppUserRelationLikeVO> likes(Long userId, RelationPageReq req) {
        requireUser(userId);
        validate(req, enumCodes(RelationLikeStatusEnum.values()), enumCodes(RelationSourceSceneEnum.values()));
        LambdaQueryWrapper<AppRelationLike> wrapper = new LambdaQueryWrapper<>();
        applyPairDirection(wrapper, directionValue(req), userId,
                AppRelationLike::getFromUserId, AppRelationLike::getToUserId);
        wrapper.eq(hasFilter(req.getStatus()), AppRelationLike::getLikeStatus, req.getStatus())
                .eq(hasFilter(req.getSource()), AppRelationLike::getSourceScene, req.getSource())
                .ge(req.getStartTime() != null, AppRelationLike::getLikedTime, req.getStartTime())
                .le(req.getEndTime() != null, AppRelationLike::getLikedTime, req.getEndTime())
                .orderByDesc(AppRelationLike::getLikedTime).orderByDesc(AppRelationLike::getId);
        Page<AppRelationLike> page = likeDao.selectPage(pageOf(req), wrapper);
        Set<Long> counterpartyIds = page.getRecords().stream()
                .map(row -> userId.equals(row.getFromUserId()) ? row.getToUserId() : row.getFromUserId())
                .collect(Collectors.toSet());
        Counterparties counterparties = loadCounterparties(counterpartyIds);
        Map<String, String> unlockNos = loadUnlockNos(userId, "like",
                page.getRecords().stream().map(AppRelationLike::getLikeNo).toList());
        List<AppUserRelationLikeVO> records = page.getRecords().stream().map(row -> {
            AppUserRelationLikeVO vo = new AppUserRelationLikeVO();
            Long counterpartyId = userId.equals(row.getFromUserId()) ? row.getToUserId() : row.getFromUserId();
            vo.setRecordNo(row.getLikeNo());
            vo.setDirection(userId.equals(row.getFromUserId()) ? "OUTBOUND" : "INBOUND");
            vo.setCounterparty(toCounterparty(counterpartyId, counterparties));
            vo.setSourceScene(row.getSourceScene());
            vo.setStatus(row.getLikeStatus());
            vo.setInvalidReason(row.getInvalidReason());
            vo.setInvalidTime(row.getInvalidTime());
            vo.setLikedTime(row.getLikedTime());
            vo.setUnlockNo(unlockNos.get(row.getLikeNo()));
            return vo;
        }).toList();
        Page<AppUserRelationLikeVO> result = convertPage(page, records);
        audit(userId, "likes", req, page.getTotal(), hasAssetPermission());
        return result;
    }

    @Override
    public Page<AppUserRelationVisitVO> visits(Long userId, RelationPageReq req) {
        requireUser(userId);
        validate(req, enumCodes(RelationVisitStatusEnum.values()), enumCodes(RelationSourceSceneEnum.values()));
        LambdaQueryWrapper<AppRelationVisit> wrapper = new LambdaQueryWrapper<>();
        applyPairDirection(wrapper, directionValue(req), userId,
                AppRelationVisit::getVisitorUserId, AppRelationVisit::getTargetUserId);
        wrapper.eq(hasFilter(req.getStatus()), AppRelationVisit::getVisitStatus, req.getStatus())
                .eq(hasFilter(req.getSource()), AppRelationVisit::getSourceScene, req.getSource())
                .ge(req.getStartTime() != null, AppRelationVisit::getLastVisitTime, req.getStartTime())
                .le(req.getEndTime() != null, AppRelationVisit::getLastVisitTime, req.getEndTime())
                .orderByDesc(AppRelationVisit::getLastVisitTime).orderByDesc(AppRelationVisit::getId);
        Page<AppRelationVisit> page = visitDao.selectPage(pageOf(req), wrapper);
        Set<Long> counterpartyIds = page.getRecords().stream()
                .map(row -> userId.equals(row.getVisitorUserId()) ? row.getTargetUserId() : row.getVisitorUserId())
                .collect(Collectors.toSet());
        Counterparties counterparties = loadCounterparties(counterpartyIds);
        Map<String, String> unlockNos = loadUnlockNos(userId, "visit",
                page.getRecords().stream().map(AppRelationVisit::getVisitNo).toList());
        List<AppUserRelationVisitVO> records = page.getRecords().stream().map(row -> {
            AppUserRelationVisitVO vo = new AppUserRelationVisitVO();
            Long counterpartyId = userId.equals(row.getVisitorUserId()) ? row.getTargetUserId() : row.getVisitorUserId();
            vo.setRecordNo(row.getVisitNo());
            vo.setDirection(userId.equals(row.getVisitorUserId()) ? "OUTBOUND" : "INBOUND");
            vo.setCounterparty(toCounterparty(counterpartyId, counterparties));
            vo.setSourceScene(row.getSourceScene());
            vo.setStatus(row.getVisitStatus());
            vo.setInvalidReason(row.getInvalidReason());
            vo.setInvalidTime(row.getInvalidTime());
            vo.setFirstVisitTime(row.getFirstVisitTime());
            vo.setLastVisitTime(row.getLastVisitTime());
            vo.setVisitCount(row.getPvCount());
            vo.setUnlockNo(unlockNos.get(row.getVisitNo()));
            return vo;
        }).toList();
        Page<AppUserRelationVisitVO> result = convertPage(page, records);
        audit(userId, "visits", req, page.getTotal(), hasAssetPermission());
        return result;
    }

    @Override
    public Page<AppUserRelationMatchVO> matches(Long userId, RelationPageReq req) {
        requireUser(userId);
        validate(req, enumCodes(RelationMatchStatusEnum.values()), enumCodes(RelationMatchSourceTypeEnum.values()));
        LambdaQueryWrapper<AppRelationMatch> wrapper = matchWrapper(userId)
                .eq(hasFilter(req.getStatus()), AppRelationMatch::getMatchStatus, req.getStatus())
                .eq(hasFilter(req.getSource()), AppRelationMatch::getPrimarySource, req.getSource())
                .ge(req.getStartTime() != null, AppRelationMatch::getMatchedTime, req.getStartTime())
                .le(req.getEndTime() != null, AppRelationMatch::getMatchedTime, req.getEndTime())
                .orderByDesc(AppRelationMatch::getMatchedTime).orderByDesc(AppRelationMatch::getId);
        Page<AppRelationMatch> page = matchDao.selectPage(pageOf(req), wrapper);
        Set<Long> counterpartyIds = page.getRecords().stream()
                .map(row -> userId.equals(row.getUserLowId()) ? row.getUserHighId() : row.getUserLowId())
                .collect(Collectors.toSet());
        Counterparties counterparties = loadCounterparties(counterpartyIds);
        Map<Long, List<String>> activeSources = loadActiveMatchSources(
                page.getRecords().stream().map(AppRelationMatch::getId).toList());
        List<AppUserRelationMatchVO> records = page.getRecords().stream().map(row -> {
            AppUserRelationMatchVO vo = new AppUserRelationMatchVO();
            Long counterpartyId = userId.equals(row.getUserLowId()) ? row.getUserHighId() : row.getUserLowId();
            vo.setRecordNo(row.getMatchNo());
            vo.setCounterparty(toCounterparty(counterpartyId, counterparties));
            vo.setPrimarySource(row.getPrimarySource());
            vo.setActiveSources(activeSources.getOrDefault(row.getId(), List.of()));
            vo.setStatus(row.getMatchStatus());
            vo.setInvalidReason(row.getInvalidReason());
            vo.setInvalidTime(row.getInvalidTime());
            vo.setMatchedTime(row.getMatchedTime());
            return vo;
        }).toList();
        Page<AppUserRelationMatchVO> result = convertPage(page, records);
        audit(userId, "matches", req, page.getTotal(), hasAssetPermission());
        return result;
    }

    @Override
    public Page<AppUserRelationUnlockVO> unlocks(Long userId, RelationUnlockPageReq req) {
        requireUser(userId);
        validate(req, enumCodes(UnlockRecordStatusEnum.values()), Set.of());
        LambdaQueryWrapper<UserUnlockRecord> wrapper = new LambdaQueryWrapper<>();
        applyPairDirection(wrapper, directionValue(req), userId,
                UserUnlockRecord::getUserId, UserUnlockRecord::getTargetUserId);
        wrapper.eq(StringUtils.hasText(req.getUnlockNo()), UserUnlockRecord::getUnlockNo, req.getUnlockNo())
                .eq(hasFilter(req.getStatus()), UserUnlockRecord::getStatus, req.getStatus())
                .eq(hasFilter(req.getSource()), UserUnlockRecord::getUnlockScene, req.getSource())
                .ge(req.getStartTime() != null, UserUnlockRecord::getEffectiveTime, req.getStartTime())
                .le(req.getEndTime() != null, UserUnlockRecord::getEffectiveTime, req.getEndTime())
                .orderByDesc(UserUnlockRecord::getEffectiveTime).orderByDesc(UserUnlockRecord::getId);
        Page<UserUnlockRecord> page = unlockRecordDao.selectPage(pageOf(req), wrapper);
        Set<Long> counterpartyIds = page.getRecords().stream()
                .map(row -> userId.equals(row.getUserId()) ? row.getTargetUserId() : row.getUserId())
                .collect(Collectors.toSet());
        Counterparties counterparties = loadCounterparties(counterpartyIds);
        Map<String, TargetStatus> targets = loadTargetStatuses(page.getRecords());
        boolean assetVisible = hasAssetPermission();
        List<AppUserRelationUnlockVO> records = page.getRecords().stream().map(row -> {
            AppUserRelationUnlockVO vo = new AppUserRelationUnlockVO();
            Long counterpartyId = userId.equals(row.getUserId()) ? row.getTargetUserId() : row.getUserId();
            TargetStatus target = targets.get(targetKey(row.getTargetBizType(), row.getTargetBizNo()));
            vo.setUnlockNo(row.getUnlockNo());
            vo.setTargetBizType(row.getTargetBizType());
            vo.setTargetBizNo(row.getTargetBizNo());
            vo.setCounterparty(toCounterparty(counterpartyId, counterparties));
            vo.setUnlockScene(row.getUnlockScene());
            vo.setUnlockMethod(row.getUnlockMethod());
            vo.setCoinCost(assetVisible ? row.getCoinCost() : null);
            vo.setStatus(row.getStatus());
            vo.setEffectiveTime(row.getEffectiveTime());
            vo.setExpireTime(row.getExpireTime());
            vo.setTargetAvailable(target != null && target.available());
            vo.setTargetInvalidReason(target == null ? null : target.invalidReason());
            vo.setTargetInvalidTime(target == null ? null : target.invalidTime());
            vo.setAssetVisible(assetVisible);
            return vo;
        }).toList();
        Page<AppUserRelationUnlockVO> result = convertPage(page, records);
        audit(userId, "unlocks", req, page.getTotal(), assetVisible);
        return result;
    }

    private AppUser requireUser(Long userId) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException(RELATION_NOT_FOUND, "APP 用户不存在");
        }
        return user;
    }

    private void validate(RelationPageReq req, Set<String> statuses, Set<String> sources) {
        if (req == null || req.getPage() < 1 || !PAGE_SIZES.contains(req.getSize())) {
            throw new BusinessException(RELATION_PARAM_ERROR, "分页参数不合法，每页仅允许 5、10、20、50 条");
        }
        if (!DIRECTIONS.contains(directionValue(req))) {
            throw new BusinessException(RELATION_PARAM_ERROR, "关系方向不合法");
        }
        if (hasFilter(req.getStatus()) && !statuses.contains(req.getStatus())) {
            throw new BusinessException(RELATION_PARAM_ERROR, "关系状态不合法");
        }
        if (hasFilter(req.getSource()) && !sources.isEmpty() && !sources.contains(req.getSource())) {
            throw new BusinessException(RELATION_PARAM_ERROR, "关系来源不合法");
        }
        if (req.getStartTime() != null && req.getEndTime() != null
                && req.getEndTime().isBefore(req.getStartTime())) {
            throw new BusinessException(RELATION_PARAM_ERROR, "结束时间不能早于开始时间");
        }
    }

    private String directionValue(RelationPageReq req) {
        if (req == null || !StringUtils.hasText(req.getDirection())) {
            return ALL_FILTER;
        }
        return req.getDirection();
    }

    private boolean hasFilter(String value) {
        return StringUtils.hasText(value) && !ALL_FILTER.equalsIgnoreCase(value.trim());
    }

    private <T> void applyPairDirection(LambdaQueryWrapper<T> wrapper, String direction, Long userId,
                                        com.baomidou.mybatisplus.core.toolkit.support.SFunction<T, ?> outbound,
                                        com.baomidou.mybatisplus.core.toolkit.support.SFunction<T, ?> inbound) {
        if ("OUTBOUND".equals(direction)) {
            wrapper.eq(outbound, userId);
        } else if ("INBOUND".equals(direction)) {
            wrapper.eq(inbound, userId);
        } else {
            wrapper.and(query -> query.eq(outbound, userId).or().eq(inbound, userId));
        }
    }

    private LambdaQueryWrapper<AppRelationMatch> matchWrapper(Long userId) {
        return new LambdaQueryWrapper<AppRelationMatch>()
                .and(query -> query.eq(AppRelationMatch::getUserLowId, userId)
                        .or().eq(AppRelationMatch::getUserHighId, userId));
    }

    private Counterparties loadCounterparties(Collection<Long> userIds) {
        Set<Long> ids = userIds.stream().filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return new Counterparties(Map.of(), Map.of());
        }
        Map<Long, AppUser> users = appUserDao.selectList(new LambdaQueryWrapper<AppUser>().in(AppUser::getId, ids))
                .stream().collect(Collectors.toMap(AppUser::getId, Function.identity(), (left, right) -> left));
        Map<Long, String> avatars = auditContentService.publicAvatars(ids.stream().toList());
        return new Counterparties(users, avatars == null ? Map.of() : avatars);
    }

    private RelationCounterpartyVO toCounterparty(Long userId, Counterparties counterparties) {
        AppUser user = counterparties.users().get(userId);
        RelationCounterpartyVO vo = new RelationCounterpartyVO();
        if (user == null || isCancelled(user)) {
            vo.setUserNo(user != null && StringUtils.hasText(user.getAnonymousNo()) ? user.getAnonymousNo() : "匿名用户");
            vo.setAnonymous(true);
            return vo;
        }
        vo.setUserId(user.getId());
        vo.setUserNo(String.valueOf(user.getId()));
        vo.setNickname(user.getNickname());
        vo.setMaskedPhone(DesensitizeUtil.maskPhone(user.getPhone()));
        vo.setAvatar(counterparties.avatars().get(user.getId()));
        vo.setAnonymous(false);
        return vo;
    }

    private boolean isCancelled(AppUser user) {
        return AccountStatusEnum.CANCELLING.getCode().equals(user.getAccountStatus())
                || AccountStatusEnum.CANCELLED.getCode().equals(user.getAccountStatus());
    }

    private Map<String, String> loadUnlockNos(Long userId, String type, List<String> recordNos) {
        if (recordNos.isEmpty()) {
            return Map.of();
        }
        return unlockRecordDao.selectList(new LambdaQueryWrapper<UserUnlockRecord>()
                        .eq(UserUnlockRecord::getUserId, userId)
                        .eq(UserUnlockRecord::getTargetBizType, type)
                        .in(UserUnlockRecord::getTargetBizNo, recordNos)
                        .eq(UserUnlockRecord::getStatus, UnlockRecordStatusEnum.ACTIVE.getCode()))
                .stream().collect(Collectors.toMap(UserUnlockRecord::getTargetBizNo,
                        UserUnlockRecord::getUnlockNo, (left, right) -> left));
    }

    private Map<Long, List<String>> loadActiveMatchSources(List<Long> matchIds) {
        if (matchIds.isEmpty()) {
            return Map.of();
        }
        return matchSourceDao.selectList(new LambdaQueryWrapper<AppRelationMatchSource>()
                        .in(AppRelationMatchSource::getMatchId, matchIds)
                        .eq(AppRelationMatchSource::getSourceStatus, RelationMatchSourceStatusEnum.ACTIVE.getCode())
                        .orderByAsc(AppRelationMatchSource::getEffectiveTime))
                .stream().collect(Collectors.groupingBy(AppRelationMatchSource::getMatchId,
                        Collectors.mapping(AppRelationMatchSource::getSourceType, Collectors.toList())));
    }

    private Map<String, TargetStatus> loadTargetStatuses(List<UserUnlockRecord> unlocks) {
        Set<String> likeNos = unlocks.stream().filter(row -> "like".equals(row.getTargetBizType()))
                .map(UserUnlockRecord::getTargetBizNo).filter(StringUtils::hasText).collect(Collectors.toSet());
        Set<String> visitNos = unlocks.stream().filter(row -> "visit".equals(row.getTargetBizType()))
                .map(UserUnlockRecord::getTargetBizNo).filter(StringUtils::hasText).collect(Collectors.toSet());
        Map<String, TargetStatus> result = new HashMap<>();
        if (!likeNos.isEmpty()) {
            likeDao.selectList(new LambdaQueryWrapper<AppRelationLike>().in(AppRelationLike::getLikeNo, likeNos))
                    .forEach(row -> result.put(targetKey("like", row.getLikeNo()),
                            new TargetStatus(RelationLikeStatusEnum.ACTIVE.getCode().equals(row.getLikeStatus()),
                                    row.getInvalidReason(), row.getInvalidTime())));
        }
        if (!visitNos.isEmpty()) {
            visitDao.selectList(new LambdaQueryWrapper<AppRelationVisit>().in(AppRelationVisit::getVisitNo, visitNos))
                    .forEach(row -> result.put(targetKey("visit", row.getVisitNo()),
                            new TargetStatus(RelationVisitStatusEnum.VISIBLE.getCode().equals(row.getVisitStatus()),
                                    row.getInvalidReason(), row.getInvalidTime())));
        }
        return result;
    }

    private String targetKey(String type, String no) {
        return (type == null ? "" : type) + ":" + (no == null ? "" : no);
    }

    private String effectiveVipStatus(UserAsset asset) {
        if (asset == null || !StringUtils.hasText(asset.getVipStatus())) {
            return "inactive";
        }
        if ("active".equals(asset.getVipStatus()) && asset.getVipExpireTime() != null
                && asset.getVipExpireTime().isBefore(LocalDateTime.now())) {
            return "expired";
        }
        return asset.getVipStatus();
    }

    private boolean hasAssetPermission() {
        UserContext context = UserContextHolder.get();
        return context != null && context.getPermissions() != null
                && context.getPermissions().contains(ASSET_PERMISSION);
    }

    private void audit(Long userId, String tab, RelationPageReq req, Long resultCount, boolean assetVisible) {
        relationAuditService.recordRelationView(new RelationViewAudit(
                "RELVIEW-" + IdUtil.fastSimpleUUID(), userId, tab,
                req == null ? 1 : req.getPage(), req == null ? 10 : req.getSize(),
                req == null ? null : req.getDirection(), req == null ? null : req.getStatus(),
                req == null ? null : req.getSource(), resultCount, assetVisible));
    }

    private <T, R> Page<R> convertPage(Page<T> source, List<R> records) {
        Page<R> target = new Page<>(source.getCurrent(), source.getSize(), source.getTotal());
        target.setRecords(records);
        return target;
    }

    private <T> Page<T> pageOf(RelationPageReq req) {
        return new Page<>(req.getPage(), req.getSize());
    }

    private Set<String> enumCodes(RelationLikeStatusEnum[] values) {
        return java.util.Arrays.stream(values).map(RelationLikeStatusEnum::getCode).collect(Collectors.toSet());
    }

    private Set<String> enumCodes(RelationVisitStatusEnum[] values) {
        return java.util.Arrays.stream(values).map(RelationVisitStatusEnum::getCode).collect(Collectors.toSet());
    }

    private Set<String> enumCodes(RelationMatchStatusEnum[] values) {
        return java.util.Arrays.stream(values).map(RelationMatchStatusEnum::getCode).collect(Collectors.toSet());
    }

    private Set<String> enumCodes(RelationSourceSceneEnum[] values) {
        return java.util.Arrays.stream(values).map(RelationSourceSceneEnum::getCode).collect(Collectors.toSet());
    }

    private Set<String> enumCodes(RelationMatchSourceTypeEnum[] values) {
        return java.util.Arrays.stream(values).map(RelationMatchSourceTypeEnum::getCode).collect(Collectors.toSet());
    }

    private Set<String> enumCodes(UnlockRecordStatusEnum[] values) {
        return java.util.Arrays.stream(values).map(UnlockRecordStatusEnum::getCode).collect(Collectors.toSet());
    }

    private record Counterparties(Map<Long, AppUser> users, Map<Long, String> avatars) {
    }

    private record TargetStatus(boolean available, String invalidReason, LocalDateTime invalidTime) {
    }
}

package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.RecommendPreferenceDao;
import com.spacetime.common.dao.RecommendViewLogDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.AppUserRelationBlock;
import com.spacetime.common.entity.RecommendPreference;
import com.spacetime.common.entity.RecommendViewLog;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.GenderEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.enums.RelationMatchStatusEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.RecommendPreferenceSaveReq;
import com.spacetime.miniapp.dto.request.RecommendViewActionReq;
import com.spacetime.miniapp.dto.response.RecommendAdvancedFilterVO;
import com.spacetime.miniapp.dto.response.RecommendCandidatePageVO;
import com.spacetime.miniapp.dto.response.RecommendCandidateVO;
import com.spacetime.miniapp.dto.response.RecommendCityVO;
import com.spacetime.miniapp.dto.response.RecommendPreferenceVO;
import com.spacetime.miniapp.dto.response.RecommendReplayItemVO;
import com.spacetime.miniapp.dto.response.RecommendReplayPageVO;
import com.spacetime.miniapp.dto.response.RecommendReplayProfileVO;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.dto.response.VipBenefitVO;
import com.spacetime.miniapp.service.RecommendService;
import com.spacetime.miniapp.service.VipService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 推荐业务服务实现。 */
@Service
@RequiredArgsConstructor
public class RecommendServiceImpl implements RecommendService {
    private static final int DEFAULT_MIN_AGE = 18;
    private static final int DEFAULT_MAX_AGE = 60;
    private static final int PAGE_SIZE = 20;
    private static final int CANDIDATE_SCAN_BATCH_SIZE = 60;
    private static final int MAX_CANDIDATE_SCAN_BATCHES = 3;
    private static final Set<String> ACTIONS = Set.of("view", "detail", "skip", "like", "never");
    private static final String NORMAL_QUOTA_KEY = "commercial.view.quota.normal";
    private static final String VIP_QUOTA_KEY = "commercial.view.quota.vip";
    private static final String ADVANCED_FILTER_BENEFIT = "advanced_filter";
    private static final String THREE_DAY_REPLAY_BENEFIT = "three_day_replay";
    private static final String NEIGHBOR_CITY_MAP_KEY = "prd08.recommend.neighbor-city-map";
    private static final String NEIGHBOR_CITY_DISABLED_REASON = "周边城市关系暂未配置，偏好可提前保存";

    private final AppUserDao appUserDao;
    private final RecommendPreferenceDao preferenceDao;
    private final UserAssetDao userAssetDao;
    private final AppConfigDao appConfigDao;
    private final AppRelationLikeDao relationLikeDao;
    private final AppRelationMatchDao relationMatchDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final UserUnlockRecordDao unlockRecordDao;
    private final AppUserAuditRecordDao auditRecordDao;
    private final RecommendViewLogDao viewLogDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final ProfileDictionaryService profileDictionaryService;
    private final AppUserAuditContentService auditContentService;
    private final VipService vipService;
    private final Prd01AccessEvaluator accessEvaluator;

    @Override
    public RecommendPreferenceVO getPreferences(Long userId) {
        AppUser user = requireBrowsableUser(userId);
        RecommendPreference preference = preferenceDao.selectByUserId(userId);
        boolean vipEffective = hasEffectiveBenefit(userId, ADVANCED_FILTER_BENEFIT);
        if (preference == null) {
            return defaultPreference(user, vipEffective);
        }
        return toPreferenceVO(preference, vipEffective, false);
    }

    @Override
    @Transactional
    public RecommendPreferenceVO savePreferences(Long userId, RecommendPreferenceSaveReq req) {
        requireBrowsableUser(userId);
        validateRequest(req);
        validateDictionaries(req);
        boolean vipEffective = hasEffectiveBenefit(userId, ADVANCED_FILTER_BENEFIT);
        if (!vipEffective && hasAdvanced(req)) {
            throw new BusinessException(403, "开通会员且高级筛选权益启用后可保存高级条件");
        }

        RecommendPreference existing = preferenceDao.selectByUserId(userId);
        if (existing == null) {
            if (req.getVersion() != 0) {
                throw versionConflict();
            }
            RecommendPreference created = toEntity(userId, req, 1, null);
            preferenceDao.insert(created);
            return toPreferenceVO(created, vipEffective, false);
        }
        if (!existing.getVersion().equals(req.getVersion())) {
            throw versionConflict();
        }
        RecommendPreference changed = toEntity(userId, req, existing.getVersion() + 1, existing);
        changed.setId(existing.getId());
        if (preferenceDao.updateByVersion(changed, existing.getVersion()) != 1) {
            throw versionConflict();
        }
        return toPreferenceVO(changed, vipEffective, false);
    }

    @Override
    public RecommendCandidatePageVO getCandidates(Long userId, String cursor) {
        AppUser current = requireBrowsableUser(userId);
        boolean vipEffective = hasEffectiveBenefit(userId, ADVANCED_FILTER_BENEFIT);
        RecommendPreference preference = resolvePreference(current);
        int remaining = remainingBrowseCount(userId, vipEffective);

        RecommendCandidatePageVO result = new RecommendCandidatePageVO();
        result.setPreferenceVersion(preference.getVersion());
        result.setRemainingBrowseCount(remaining);
        if (remaining == 0) {
            result.setItems(List.of());
            result.setWaitingReason("browse_limit");
            return result;
        }

        List<RecommendCandidateVO> items = new ArrayList<>();
        AppUser lastAccepted = null;
        String scanCursor = cursor;
        String previousScanCursor = null;
        String continuationCursor = null;
        int scannedBatches = 0;
        while (items.size() < PAGE_SIZE && scannedBatches < MAX_CANDIDATE_SCAN_BATCHES) {
            LambdaQueryWrapper<AppUser> wrapper = candidateWrapper(
                    current, preference, vipEffective, scanCursor);
            List<AppUser> queried = safeUsers(appUserDao.selectList(wrapper));
            scannedBatches++;
            if (queried.isEmpty()) {
                break;
            }
            Map<Long, String> access = accessProjectionService.projectAll(queried);
            List<AppUser> openCandidates = queried.stream()
                    .filter(candidate -> "OPEN".equals(access.get(candidate.getId())))
                    .toList();
            List<Long> openCandidateIds = openCandidates.stream().map(AppUser::getId).toList();
            Set<Long> blockedCandidateIds = blockedCandidateIds(userId, openCandidateIds);
            List<AppUser> visibleCandidates = openCandidates.stream()
                    .filter(candidate -> !blockedCandidateIds.contains(candidate.getId()))
                    .limit(PAGE_SIZE - items.size())
                    .toList();
            Map<Long, PublicProfileVO> profiles = batchCandidateProfiles(userId, visibleCandidates);
            for (AppUser candidate : visibleCandidates) {
                PublicProfileVO profile = profiles.get(candidate.getId());
                if (profile == null) {
                    continue;
                }
                RecommendCandidateVO item = new RecommendCandidateVO();
                item.setCandidateNo(String.valueOf(candidate.getId()));
                item.setUserId(candidate.getId());
                item.setProfile(profile);
                item.setLiked(Boolean.TRUE.equals(profile.getLiked()));
                item.setCommunicationMode(profile.getCommunicationMode());
                item.setActualCity(profile.getCurrentCity());
                items.add(item);
                lastAccepted = candidate;
            }

            if (items.size() >= PAGE_SIZE || queried.size() < CANDIDATE_SCAN_BATCH_SIZE) {
                break;
            }
            String nextScanCursor = encodeCursor(queried.getLast());
            if (Objects.equals(nextScanCursor, scanCursor)
                    || Objects.equals(nextScanCursor, previousScanCursor)) {
                break;
            }
            if (scannedBatches >= MAX_CANDIDATE_SCAN_BATCHES) {
                continuationCursor = nextScanCursor;
                break;
            }
            previousScanCursor = scanCursor;
            scanCursor = nextScanCursor;
        }
        result.setItems(items);
        result.setWaitingReason(items.isEmpty() ? "no_candidate" : null);
        if (items.size() == PAGE_SIZE) {
            result.setNextCursor(lastAccepted == null ? null : encodeCursor(lastAccepted));
        } else if (continuationCursor != null) {
            result.setNextCursor(continuationCursor);
        }
        return result;
    }

    /**
     * 批量构造推荐卡片所需公开资料。候选已经过准入和屏蔽过滤，因此这里只做展示投影，
     * 避免再次逐用户执行完整公开资料查询。
     */
    private Map<Long, PublicProfileVO> batchCandidateProfiles(Long currentUserId,
                                                               List<AppUser> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return Map.of();
        }
        List<Long> candidateIds = candidates.stream().map(AppUser::getId).toList();
        Map<Long, String> avatars = safeMap(auditContentService.publicAvatars(candidateIds));
        Map<Long, List<String>> albums = safeMap(auditContentService.publicAlbumPhotos(candidateIds));
        Map<AuditContentKey, AppUserAuditRecord> supplementalContent =
                approvedSupplementalContent(candidateIds);
        Map<String, String> regionLabels = dictionaryLabels(ProfileDictType.CHINA_REGION,
                candidates.stream()
                        .flatMap(candidate -> java.util.stream.Stream.of(
                                candidate.getLocationCity(), candidate.getHometownCity()))
                        .toList());
        Map<String, String> identityLabels = dictionaryLabels(ProfileDictType.IDENTITY,
                candidates.stream().map(AppUser::getIdentity).toList());
        Map<String, String> industryLabels = dictionaryLabels(ProfileDictType.INDUSTRY,
                candidates.stream().map(AppUser::getIndustry).toList());
        Map<String, String> occupationLabels = dictionaryLabels(ProfileDictType.OCCUPATION,
                candidates.stream().map(AppUser::getOccupation).toList());
        Map<String, String> incomeLabels = dictionaryLabels(ProfileDictType.ANNUAL_INCOME,
                candidates.stream().map(AppUser::getAnnualIncome).toList());
        Map<String, String> datingGoalLabels = dictionaryLabels(ProfileDictType.DATING_GOAL,
                candidates.stream().map(AppUser::getDatingGoal).toList());
        Map<String, String> maritalLabels = dictionaryLabels(ProfileDictType.MARITAL_STATUS,
                candidates.stream().map(AppUser::getMaritalStatus).toList());
        Map<String, String> emotionalLabels = dictionaryLabels(ProfileDictType.EMOTIONAL_STATUS,
                candidates.stream().map(AppUser::getEmotionalStatus).toList());
        Map<Long, List<String>> tagCodes = candidates.stream().collect(Collectors.toMap(
                AppUser::getId, candidate -> parseTagCodes(candidate.getTags()),
                (left, right) -> left, LinkedHashMap::new));
        Map<String, String> tagLabels = dictionaryLabels(ProfileDictType.PROFILE_TAG,
                tagCodes.values().stream().flatMap(List::stream).toList());
        Set<Long> likedIds = activeLikedCandidateIds(currentUserId, candidateIds);
        Map<Long, AppRelationMatch> matches = activeMatches(currentUserId, candidateIds);
        Set<Long> unlockedIds = activeIdealUnlocks(currentUserId, candidateIds);

        Map<Long, PublicProfileVO> result = new LinkedHashMap<>();
        for (AppUser candidate : candidates) {
            Long candidateId = candidate.getId();
            AppRelationMatch match = matches.get(candidateId);
            boolean matched = match != null;
            boolean privateMessage = matched || unlockedIds.contains(candidateId);
            List<String> photos = albums.getOrDefault(candidateId, List.of());
            PublicProfileVO profile = new PublicProfileVO();
            profile.setUserId(candidateId);
            profile.setUserNo("USR-" + String.format(Locale.ROOT, "%012d", candidateId));
            profile.setNickname(candidate.getNickname());
            profile.setAvatar(avatars.get(candidateId));
            profile.setHeroPhoto(contentMedia(supplementalContent.get(
                    new AuditContentKey(candidateId, AppUserAuditTypeEnum.PROFILE_BG.getCode()))));
            profile.setPhotos(photos);
            profile.setGender(candidate.getGender());
            profile.setAge(candidate.getAge());
            profile.setHeight(candidate.getHeight());
            profile.setZodiac(candidate.getZodiac());
            profile.setCurrentCity(batchLabel(regionLabels, candidate.getLocationCity()));
            profile.setHometownCity(batchLabel(regionLabels, candidate.getHometownCity()));
            profile.setSchool(candidate.getSchool());
            profile.setIdentityLabel(batchLabel(identityLabels, candidate.getIdentity()));
            profile.setIndustryLabel(batchLabel(industryLabels, candidate.getIndustry()));
            profile.setOccupationLabel(batchLabel(occupationLabels, candidate.getOccupation()));
            profile.setCompany(candidate.getCompany());
            profile.setAnnualIncomeLabel(batchLabel(incomeLabels, candidate.getAnnualIncome()));
            profile.setTags(tagCodes.getOrDefault(candidateId, List.of()).stream()
                    .map(tagLabels::get).filter(StrUtil::isNotBlank).toList());
            profile.setIntroduction(contentText(supplementalContent.get(
                    new AuditContentKey(candidateId, AppUserAuditTypeEnum.ABOUT_ME.getCode()))));
            profile.setDatingGoal(batchLabel(datingGoalLabels, candidate.getDatingGoal()));
            profile.setMaritalStatus(batchLabel(maritalLabels, candidate.getMaritalStatus()));
            profile.setEmotionalStatus(batchLabel(emotionalLabels, candidate.getEmotionalStatus()));
            profile.setFavoriteSongName(candidate.getFavoriteSongName());
            profile.setFavoriteSongArtist(candidate.getFavoriteSongArtist());
            profile.setFavoriteSongCoverUrl(candidate.getFavoriteSongCoverUrl());
            profile.setLiked(likedIds.contains(candidateId));
            profile.setMatched(matched);
            profile.setMatchNo(matched ? match.getMatchNo() : null);
            profile.setCanEnterConversation(privateMessage);
            profile.setCommunicationMode(privateMessage ? "PRIVATE_MESSAGE" : "WHISPER");
            profile.setCertifications(List.of("AVATAR", "REAL_NAME", "EDUCATION"));
            result.put(candidateId, profile);
        }
        return result;
    }

    @Override
    @Transactional
    public void recordAction(Long userId, String candidateNo, String action, RecommendViewActionReq req) {
        requireBrowsableUser(userId);
        if (req == null || StrUtil.isBlank(req.getRequestId()) || !ACTIONS.contains(action)) {
            throw new BusinessException(400, "推荐动作参数有误");
        }
        Long candidateId = parseCandidateNo(candidateNo);
        requireOpenUser(candidateId);
        if (candidateId.equals(userId) || isBlocked(userId, candidateId)) {
            throw new BusinessException(410, "该嘉宾暂时无法查看");
        }
        if (viewLogDao.selectByRequestAction(userId, req.getRequestId(), action) != null) {
            return;
        }
        if ("view".equals(action) && remainingBrowseCount(userId, isVipEffective(userId)) == 0) {
            throw new BusinessException(429, "今天的推荐已看完");
        }
        RecommendViewLog entity = new RecommendViewLog();
        entity.setEventNo("RVL-" + IdUtil.getSnowflakeNextIdStr());
        entity.setRequestId(req.getRequestId());
        entity.setUserId(userId);
        entity.setCandidateUserId(candidateId);
        entity.setScene("recommend");
        entity.setFilterVersion(req.getFilterVersion());
        entity.setAction(action);
        entity.setPosition(req.getPosition());
        entity.setViewedAt(LocalDateTime.now());
        viewLogDao.insert(entity);

        if ("never".equals(action)
                && relationBlockDao.selectActive(userId, candidateId,
                RelationBlockTypeEnum.NO_RECOMMEND.getCode()) == null) {
            com.spacetime.common.entity.AppUserRelationBlock block =
                    new com.spacetime.common.entity.AppUserRelationBlock();
            block.setUserId(userId);
            block.setTargetUserId(candidateId);
            block.setBlockType(RelationBlockTypeEnum.NO_RECOMMEND.getCode());
            block.setSourceScene("recommend");
            block.setStatus(CommonStatusEnum.ENABLED.getCode());
            relationBlockDao.insert(block);
        }
    }

    @Override
    public RecommendReplayPageVO getReplay(Long userId) {
        requireBrowsableUser(userId);
        if (!hasEffectiveBenefit(userId, THREE_DAY_REPLAY_BENEFIT)) {
            throw new BusinessException(403, "开通会员且三天回看权益启用后可查看回看记录");
        }
        LocalDateTime start = LocalDate.now().minusDays(2).atStartOfDay();
        List<RecommendViewLog> raw = viewLogDao.selectList(new LambdaQueryWrapper<RecommendViewLog>()
                .eq(RecommendViewLog::getUserId, userId)
                .ge(RecommendViewLog::getViewedAt, start)
                .in(RecommendViewLog::getAction, List.of("view", "skip", "detail", "like"))
                .orderByDesc(RecommendViewLog::getViewedAt));
        Map<Long, RecommendViewLog> latest = new LinkedHashMap<>();
        for (RecommendViewLog log : raw == null ? List.<RecommendViewLog>of() : raw) {
            if (log.getCandidateUserId() != null) {
                latest.putIfAbsent(log.getCandidateUserId(), log);
            }
        }
        List<Long> candidateIds = List.copyOf(latest.keySet());
        if (candidateIds.isEmpty()) {
            RecommendReplayPageVO empty = new RecommendReplayPageVO();
            empty.setItems(List.of());
            return empty;
        }

        List<AppUser> targets = safeUsers(appUserDao.selectByIds(candidateIds));
        Map<Long, AppUser> targetById = targets.stream()
                .filter(target -> target != null && target.getId() != null)
                .collect(Collectors.toMap(AppUser::getId, Function.identity(),
                        (left, right) -> left, LinkedHashMap::new));
        Map<Long, String> accessById = accessProjectionService.projectAll(targets);
        Set<Long> blockedCandidateIds = blockedCandidateIds(userId, candidateIds);
        List<Long> visibleCandidateIds = candidateIds.stream()
                .filter(candidateId -> targetById.containsKey(candidateId))
                .filter(candidateId -> "OPEN".equals(accessById.get(candidateId)))
                .filter(candidateId -> !blockedCandidateIds.contains(candidateId))
                .toList();
        Set<Long> visibleCandidateIdSet = new LinkedHashSet<>(visibleCandidateIds);

        Map<Long, String> avatars = auditContentService.publicAvatars(visibleCandidateIds);
        List<AppUser> visibleTargets = visibleCandidateIds.stream().map(targetById::get).toList();
        Map<String, String> cityLabels = profileDictionaryService.labels(
                ProfileDictType.CHINA_REGION,
                visibleTargets.stream().map(AppUser::getLocationCity)
                        .filter(StrUtil::isNotBlank).distinct().toList());
        Map<String, String> occupationLabels = profileDictionaryService.labels(
                ProfileDictType.OCCUPATION,
                visibleTargets.stream().map(AppUser::getOccupation)
                        .filter(StrUtil::isNotBlank).distinct().toList());
        Set<Long> likedCandidateIds = activeLikedCandidateIds(userId, visibleCandidateIds);

        List<RecommendReplayItemVO> items = new ArrayList<>();
        for (RecommendViewLog log : latest.values()) {
            AppUser target = targetById.get(log.getCandidateUserId());
            if (target == null || !visibleCandidateIdSet.contains(target.getId())) {
                continue;
            }
            boolean liked = likedCandidateIds.contains(target.getId());
            RecommendReplayItemVO item = new RecommendReplayItemVO();
            item.setCandidateNo(String.valueOf(target.getId()));
            item.setProfile(replayProfile(target, avatars.get(target.getId()), cityLabels,
                    occupationLabels, liked));
            item.setViewedAt(log.getViewedAt());
            item.setLastAction(log.getAction());
            item.setDateGroup(dateGroup(log.getViewedAt()));
            item.setLiked(liked);
            items.add(item);
        }
        RecommendReplayPageVO result = new RecommendReplayPageVO();
        result.setItems(items);
        return result;
    }

    private AppUser requireOpenUser(Long userId) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(403, "完成资料和三项认证后即可使用推荐");
        }
        return user;
    }

    private AppUser requireBrowsableUser(Long userId) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException(403, "请先完成基础资料后使用推荐");
        }
        String relationAccess = accessProjectionService.project(user);
        if ("ABNORMAL".equals(relationAccess)
                || !Boolean.TRUE.equals(accessEvaluator.evaluate(user).getCanBrowseCards())) {
            throw new BusinessException(403, "请先完成基础资料后使用推荐");
        }
        return user;
    }

    private RecommendPreference resolvePreference(AppUser user) {
        RecommendPreference existing = preferenceDao.selectByUserId(user.getId());
        if (existing != null) {
            return existing;
        }
        RecommendPreferenceVO defaults = defaultPreference(user,
                hasEffectiveBenefit(user.getId(), ADVANCED_FILTER_BENEFIT));
        RecommendPreference entity = new RecommendPreference();
        entity.setUserId(user.getId());
        entity.setVersion(0);
        entity.setTargetCityCodes(JSONUtil.toJsonStr(defaults.getTargetCities().stream()
                .map(RecommendCityVO::getCode).toList()));
        entity.setAllowNeighborCity(0);
        entity.setOnlyCertifiedUsers(0);
        entity.setMinAge(defaults.getMinAge());
        entity.setMaxAge(defaults.getMaxAge());
        entity.setEducationCodes("[]");
        entity.setHometowns("[]");
        entity.setSchoolCodes("[]");
        entity.setMajorNames("[]");
        return entity;
    }

    private LambdaQueryWrapper<AppUser> candidateWrapper(AppUser current,
                                                          RecommendPreference preference,
                                                          boolean vipEffective,
                                                          String cursor) {
        String opposite = GenderEnum.MALE.getCode().equals(current.getGender())
                ? GenderEnum.FEMALE.getCode() : GenderEnum.MALE.getCode();
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<AppUser>()
                .ne(AppUser::getId, current.getId())
                .eq(AppUser::getGender, opposite)
                .eq(AppUser::getAccountStatus, AccountStatusEnum.NORMAL.getCode())
                .in(AppUser::getLocationCity, effectiveTargetCities(preference))
                .between(AppUser::getAge, preference.getMinAge(), preference.getMaxAge());
        if (vipEffective) {
            wrapper.ge(preference.getMinHeight() != null, AppUser::getHeight, preference.getMinHeight())
                    .le(preference.getMaxHeight() != null, AppUser::getHeight, preference.getMaxHeight())
                    .ge(preference.getMinWeight() != null, AppUser::getWeight, preference.getMinWeight())
                    .le(preference.getMaxWeight() != null, AppUser::getWeight, preference.getMaxWeight())
                    .in(!parseList(preference.getEducationCodes()).isEmpty(), AppUser::getEducationLevel,
                            parseList(preference.getEducationCodes()))
                    .in(!parseList(preference.getHometowns()).isEmpty(), AppUser::getHometownCity,
                            parseList(preference.getHometowns()))
                    .in(!parseList(preference.getMajorNames()).isEmpty(), AppUser::getMajor,
                            parseList(preference.getMajorNames()));
        }
        CursorValue cursorValue = decodeCursor(cursor);
        if (cursorValue != null) {
            if (cursorValue.time() == null) {
                wrapper.isNull(AppUser::getLastLoginTime)
                        .gt(AppUser::getId, cursorValue.userId());
            } else {
                wrapper.and(value -> value.lt(AppUser::getLastLoginTime, cursorValue.time())
                        .or(nested -> nested.eq(AppUser::getLastLoginTime, cursorValue.time())
                                .gt(AppUser::getId, cursorValue.userId()))
                        .or()
                        .isNull(AppUser::getLastLoginTime));
            }
        }
        return wrapper.orderByDesc(AppUser::getLastLoginTime)
                .orderByAsc(AppUser::getId)
                .last("LIMIT " + CANDIDATE_SCAN_BATCH_SIZE);
    }

    private boolean isBlocked(Long userId, Long candidateId) {
        return relationBlockDao.selectActive(userId, candidateId,
                RelationBlockTypeEnum.BLACKLIST.getCode()) != null
                || relationBlockDao.selectActive(candidateId, userId,
                RelationBlockTypeEnum.BLACKLIST.getCode()) != null
                || relationBlockDao.selectActive(userId, candidateId,
                RelationBlockTypeEnum.NO_RECOMMEND.getCode()) != null;
    }

    private Set<Long> blockedCandidateIds(Long userId, List<Long> candidateIds) {
        if (candidateIds == null || candidateIds.isEmpty()) {
            return Set.of();
        }
        List<AppUserRelationBlock> blocks = relationBlockDao.selectActiveBetweenUserAndTargets(
                userId,
                candidateIds,
                List.of(RelationBlockTypeEnum.BLACKLIST.getCode(),
                        RelationBlockTypeEnum.NO_RECOMMEND.getCode()));
        Set<Long> blocked = new LinkedHashSet<>();
        for (AppUserRelationBlock block : blocks == null ? List.<AppUserRelationBlock>of() : blocks) {
            if (Objects.equals(userId, block.getUserId())) {
                blocked.add(block.getTargetUserId());
            } else if (Objects.equals(userId, block.getTargetUserId())
                    && RelationBlockTypeEnum.BLACKLIST.getCode().equals(block.getBlockType())) {
                blocked.add(block.getUserId());
            }
        }
        return blocked;
    }

    private Map<String, String> dictionaryLabels(String dictType, List<String> codes) {
        List<String> normalized = codes == null ? List.of() : codes.stream()
                .filter(StrUtil::isNotBlank)
                .map(StrUtil::trim)
                .distinct()
                .toList();
        return normalized.isEmpty()
                ? Map.of()
                : safeMap(profileDictionaryService.labels(dictType, normalized));
    }

    private Map<AuditContentKey, AppUserAuditRecord> approvedSupplementalContent(
            List<Long> candidateIds) {
        List<AppUserAuditRecord> records = auditRecordDao.selectList(
                new LambdaQueryWrapper<AppUserAuditRecord>()
                        .in(AppUserAuditRecord::getUserId, candidateIds)
                        .in(AppUserAuditRecord::getAuditType, List.of(
                                AppUserAuditTypeEnum.PROFILE_BG.getCode(),
                                AppUserAuditTypeEnum.ABOUT_ME.getCode()))
                        .eq(AppUserAuditRecord::getStatus, AppUserAuditStatusEnum.APPROVED.getCode())
                        .orderByDesc(AppUserAuditRecord::getAuditTime)
                        .orderByDesc(AppUserAuditRecord::getSubmitTime)
                        .orderByDesc(AppUserAuditRecord::getId));
        Map<AuditContentKey, AppUserAuditRecord> result = new LinkedHashMap<>();
        for (AppUserAuditRecord record : records == null
                ? List.<AppUserAuditRecord>of() : records) {
            result.putIfAbsent(new AuditContentKey(record.getUserId(), record.getAuditType()), record);
        }
        return result;
    }

    private Map<Long, AppRelationMatch> activeMatches(Long userId, List<Long> candidateIds) {
        List<AppRelationMatch> matches = relationMatchDao.selectList(
                new LambdaQueryWrapper<AppRelationMatch>()
                        .eq(AppRelationMatch::getMatchStatus, RelationMatchStatusEnum.MATCHED.getCode())
                        .eq(AppRelationMatch::getActiveMarker, 1)
                        .and(pair -> pair.nested(low -> low
                                        .eq(AppRelationMatch::getUserLowId, userId)
                                        .in(AppRelationMatch::getUserHighId, candidateIds))
                                .or(high -> high
                                        .eq(AppRelationMatch::getUserHighId, userId)
                                        .in(AppRelationMatch::getUserLowId, candidateIds))));
        Map<Long, AppRelationMatch> result = new LinkedHashMap<>();
        for (AppRelationMatch match : matches == null ? List.<AppRelationMatch>of() : matches) {
            Long targetId = Objects.equals(userId, match.getUserLowId())
                    ? match.getUserHighId() : match.getUserLowId();
            if (targetId != null) {
                result.putIfAbsent(targetId, match);
            }
        }
        return result;
    }

    private Set<Long> activeIdealUnlocks(Long userId, List<Long> candidateIds) {
        LocalDateTime now = LocalDateTime.now();
        List<UserUnlockRecord> records = unlockRecordDao.selectList(
                new LambdaQueryWrapper<UserUnlockRecord>()
                        .eq(UserUnlockRecord::getUserId, userId)
                        .eq(UserUnlockRecord::getTargetBizType, "ideal")
                        .in(UserUnlockRecord::getTargetUserId, candidateIds)
                        .eq(UserUnlockRecord::getStatus, UnlockRecordStatusEnum.ACTIVE.getCode())
                        .eq(UserUnlockRecord::getActiveMarker, 1)
                        .and(active -> active.isNull(UserUnlockRecord::getExpireTime)
                                .or().gt(UserUnlockRecord::getExpireTime, now)));
        return (records == null ? List.<UserUnlockRecord>of() : records).stream()
                .map(UserUnlockRecord::getTargetUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<String> parseTagCodes(String tags) {
        if (StrUtil.isBlank(tags)) {
            return List.of();
        }
        try {
            return JSONUtil.parseArray(tags).toList(String.class).stream()
                    .map(StrUtil::trim)
                    .filter(StrUtil::isNotBlank)
                    .distinct()
                    .toList();
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }

    private String contentMedia(AppUserAuditRecord record) {
        return record == null ? null : record.getMediaUrl();
    }

    private String contentText(AppUserAuditRecord record) {
        return record == null ? null : record.getContentText();
    }

    private <K, V> Map<K, V> safeMap(Map<K, V> values) {
        return values == null ? Map.of() : values;
    }

    private Set<Long> activeLikedCandidateIds(Long userId, List<Long> candidateIds) {
        if (candidateIds.isEmpty()) {
            return Set.of();
        }
        List<AppRelationLike> likes = relationLikeDao.selectList(new LambdaQueryWrapper<AppRelationLike>()
                .eq(AppRelationLike::getFromUserId, userId)
                .in(AppRelationLike::getToUserId, candidateIds)
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                .eq(AppRelationLike::getActiveMarker, 1));
        return (likes == null ? List.<AppRelationLike>of() : likes).stream()
                .map(AppRelationLike::getToUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private RecommendReplayProfileVO replayProfile(AppUser target,
                                                    String avatar,
                                                    Map<String, String> cityLabels,
                                                    Map<String, String> occupationLabels,
                                                    boolean liked) {
        RecommendReplayProfileVO profile = new RecommendReplayProfileVO();
        profile.setUserId(target.getId());
        profile.setUserNo("USR-" + String.format(Locale.ROOT, "%012d", target.getId()));
        profile.setNickname(target.getNickname());
        profile.setAvatar(avatar);
        profile.setGender(target.getGender());
        profile.setAge(target.getAge());
        profile.setCurrentCity(batchLabel(cityLabels, target.getLocationCity()));
        profile.setOccupationLabel(batchLabel(occupationLabels, target.getOccupation()));
        profile.setLiked(liked);
        profile.setMatched(false);
        profile.setCanEnterConversation(false);
        profile.setCommunicationMode("WHISPER");
        return profile;
    }

    private String batchLabel(Map<String, String> labels, String code) {
        return StrUtil.isBlank(code) || labels == null ? null : labels.get(code.trim());
    }

    private int remainingBrowseCount(Long userId, boolean vipEffective) {
        String key = vipEffective ? VIP_QUOTA_KEY : NORMAL_QUOTA_KEY;
        List<AppConfig> configs = appConfigDao.selectByKeys(List.of(key));
        int quota = vipEffective ? 20 : 10;
        if (configs != null && !configs.isEmpty()) {
            try {
                quota = Math.max(0, Integer.parseInt(configs.get(0).getConfigValue()));
            } catch (NumberFormatException ignored) {
                // 配置异常时使用安全默认值，不把错误误判为额度为零。
            }
        }
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        List<RecommendViewLog> views = viewLogDao.selectList(new LambdaQueryWrapper<RecommendViewLog>()
                .eq(RecommendViewLog::getUserId, userId)
                .eq(RecommendViewLog::getAction, "view")
                .between(RecommendViewLog::getViewedAt, start, end));
        return Math.max(0, quota - (views == null ? 0 : views.size()));
    }

    private List<AppUser> safeUsers(List<AppUser> users) {
        return users == null ? List.of() : users;
    }

    private Long parseCandidateNo(String candidateNo) {
        try {
            long value = Long.parseLong(candidateNo);
            if (value <= 0) {
                throw new NumberFormatException();
            }
            return value;
        } catch (NumberFormatException ignored) {
            throw new BusinessException(400, "候选编号无效");
        }
    }

    private String dateGroup(LocalDateTime time) {
        LocalDate date = time.toLocalDate();
        if (date.equals(LocalDate.now())) {
            return "今天";
        }
        if (date.equals(LocalDate.now().minusDays(1))) {
            return "昨天";
        }
        return "前天";
    }

    private String encodeCursor(AppUser user) {
        String raw = (user.getLastLoginTime() == null ? "" : user.getLastLoginTime())
                + "|" + user.getId();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private CursorValue decodeCursor(String cursor) {
        if (StrUtil.isBlank(cursor)) {
            return null;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            int delimiter = raw.lastIndexOf('|');
            String timeText = raw.substring(0, delimiter);
            LocalDateTime time = timeText.isBlank() || "null".equals(timeText)
                    ? null : LocalDateTime.parse(timeText);
            return new CursorValue(time,
                    Long.parseLong(raw.substring(delimiter + 1)));
        } catch (RuntimeException ignored) {
            throw new BusinessException(400, "推荐游标无效");
        }
    }

    private record CursorValue(LocalDateTime time, Long userId) {
    }

    private record AuditContentKey(Long userId, String auditType) {
    }

    private RecommendPreferenceVO defaultPreference(AppUser user, boolean vipEffective) {
        Integer age = currentAge(user);
        if (age == null || StrUtil.isBlank(user.getLocationCity())) {
            throw new BusinessException(409, "请先完善现居城市和出生日期");
        }
        RecommendPreferenceVO vo = new RecommendPreferenceVO();
        vo.setVersion(0);
        vo.setTargetCities(List.of(city(user.getLocationCity())));
        vo.setAllowNeighborCity(false);
        vo.setOnlyCertifiedUsers(false);
        applyNeighborCapability(vo, List.of(user.getLocationCity()));
        vo.setMinAge(Math.max(DEFAULT_MIN_AGE, age - 5));
        vo.setMaxAge(Math.min(DEFAULT_MAX_AGE, age + 5));
        vo.setAdvanced(emptyAdvanced());
        vo.setVipEffective(vipEffective);
        vo.setAdvancedEffectiveCount(0);
        vo.setDefaulted(true);
        return vo;
    }

    private RecommendPreferenceVO toPreferenceVO(RecommendPreference entity,
                                                  boolean vipEffective,
                                                  boolean defaulted) {
        RecommendAdvancedFilterVO advanced = vipEffective
                ? advancedFrom(entity) : emptyAdvanced();

        RecommendPreferenceVO vo = new RecommendPreferenceVO();
        vo.setVersion(entity.getVersion());
        List<String> targetCityCodes = parseList(entity.getTargetCityCodes());
        vo.setTargetCities(targetCityCodes.stream().map(this::city).toList());
        applyNeighborCapability(vo, targetCityCodes);
        vo.setAllowNeighborCity(Integer.valueOf(1).equals(entity.getAllowNeighborCity()));
        vo.setOnlyCertifiedUsers(Integer.valueOf(1).equals(entity.getOnlyCertifiedUsers()));
        vo.setMinAge(entity.getMinAge());
        vo.setMaxAge(entity.getMaxAge());
        vo.setAdvanced(advanced);
        vo.setVipEffective(vipEffective);
        vo.setAdvancedEffectiveCount(vipEffective ? advancedCount(advanced) : 0);
        vo.setDefaulted(defaulted);
        return vo;
    }

    private RecommendAdvancedFilterVO advancedFrom(RecommendPreference entity) {
        RecommendAdvancedFilterVO advanced = new RecommendAdvancedFilterVO();
        advanced.setMinHeight(entity.getMinHeight());
        advanced.setMaxHeight(entity.getMaxHeight());
        advanced.setMinWeight(entity.getMinWeight());
        advanced.setMaxWeight(entity.getMaxWeight());
        advanced.setEducationCodes(parseList(entity.getEducationCodes()));
        advanced.setHometowns(parseList(entity.getHometowns()));
        advanced.setSchoolCodes(parseList(entity.getSchoolCodes()));
        advanced.setSchoolFilterAvailable(false);
        advanced.setMajorNames(parseList(entity.getMajorNames()));
        return advanced;
    }

    private RecommendPreference toEntity(Long userId, RecommendPreferenceSaveReq req, int version,
                                          RecommendPreference previous) {
        RecommendPreference entity = new RecommendPreference();
        entity.setUserId(userId);
        entity.setTargetCityCodes(JSONUtil.toJsonStr(normalize(req.getTargetCityCodes())));
        entity.setAllowNeighborCity(Boolean.TRUE.equals(req.getAllowNeighborCity()) ? 1 : 0);
        entity.setOnlyCertifiedUsers(req.getOnlyCertifiedUsers() == null
                ? previous == null ? 0 : previous.getOnlyCertifiedUsers()
                : Boolean.TRUE.equals(req.getOnlyCertifiedUsers()) ? 1 : 0);
        entity.setMinAge(req.getMinAge());
        entity.setMaxAge(req.getMaxAge());
        entity.setMinHeight(req.getMinHeight());
        entity.setMaxHeight(req.getMaxHeight());
        entity.setMinWeight(req.getMinWeight());
        entity.setMaxWeight(req.getMaxWeight());
        entity.setEducationCodes(JSONUtil.toJsonStr(normalize(req.getEducationCodes())));
        entity.setHometowns(JSONUtil.toJsonStr(normalize(req.getHometowns())));
        entity.setSchoolCodes(JSONUtil.toJsonStr(normalize(req.getSchoolCodes())));
        entity.setMajorNames(JSONUtil.toJsonStr(normalize(req.getMajorNames())));
        entity.setVersion(version);
        return entity;
    }

    private void validateRequest(RecommendPreferenceSaveReq req) {
        if (req == null || req.getVersion() == null || req.getVersion() < 0) {
            throw new BusinessException(400, "筛选条件有误，请检查后重试");
        }
        List<String> cities = normalize(req.getTargetCityCodes());
        if (cities.isEmpty() || cities.size() > 3
                || req.getMinAge() == null || req.getMaxAge() == null
                || req.getMinAge() < DEFAULT_MIN_AGE || req.getMaxAge() > DEFAULT_MAX_AGE
                || req.getMinAge() > req.getMaxAge()) {
            throw new BusinessException(400, "筛选条件有误，请检查后重试");
        }
        validateRange(req.getMinHeight(), req.getMaxHeight(), 140, 220);
        validateRange(req.getMinWeight(), req.getMaxWeight(), 30, 200);
    }

    private void validateRange(Integer min, Integer max, int lower, int upper) {
        if (min == null && max == null) {
            return;
        }
        if ((min != null && (min < lower || min > upper))
                || (max != null && (max < lower || max > upper))
                || (min != null && max != null && min > max)) {
            throw new BusinessException(400, "筛选条件有误，请检查后重试");
        }
    }

    private void validateDictionaries(RecommendPreferenceSaveReq req) {
        for (String cityCode : normalize(req.getTargetCityCodes())) {
            profileDictionaryService.requireCode(ProfileDictType.CHINA_REGION, cityCode, "目标城市");
        }
        if (!normalize(req.getSchoolCodes()).isEmpty()) {
            throw new BusinessException(409, "学校字典暂未配置，暂不能保存学校筛选条件");
        }
        for (String educationCode : normalize(req.getEducationCodes())) {
            profileDictionaryService.requireCode(ProfileDictType.EDUCATION_LEVEL,
                    educationCode, "学历");
        }
        for (String hometownCode : normalize(req.getHometowns())) {
            profileDictionaryService.requireCode(ProfileDictType.CHINA_REGION,
                    hometownCode, "家乡");
        }
    }

    private boolean hasAdvanced(RecommendPreferenceSaveReq req) {
        return req.getMinHeight() != null || req.getMaxHeight() != null
                || req.getMinWeight() != null || req.getMaxWeight() != null
                || !normalize(req.getEducationCodes()).isEmpty()
                || !normalize(req.getHometowns()).isEmpty()
                || !normalize(req.getSchoolCodes()).isEmpty()
                || !normalize(req.getMajorNames()).isEmpty();
    }

    private boolean isVipEffective(Long userId) {
        UserAsset asset = userAssetDao.selectByUserId(userId);
        return asset != null
                && VipStatusEnum.ACTIVE.getCode().equals(asset.getVipStatus())
                && (asset.getVipExpireTime() == null || asset.getVipExpireTime().isAfter(LocalDateTime.now()));
    }

    private boolean hasEffectiveBenefit(Long userId, String benefitCode) {
        if (!isVipEffective(userId)) {
            return false;
        }
        List<VipBenefitVO> benefits = vipService.getBenefits();
        return benefits != null && benefits.stream()
                .anyMatch(item -> benefitCode.equals(item.getBenefitCode()));
    }

    private RecommendAdvancedFilterVO emptyAdvanced() {
        RecommendAdvancedFilterVO advanced = new RecommendAdvancedFilterVO();
        advanced.setEducationCodes(List.of());
        advanced.setHometowns(List.of());
        advanced.setSchoolCodes(List.of());
        advanced.setSchoolFilterAvailable(false);
        advanced.setMajorNames(List.of());
        return advanced;
    }

    private int advancedCount(RecommendAdvancedFilterVO advanced) {
        int count = advanced.getMinHeight() == null && advanced.getMaxHeight() == null ? 0 : 1;
        count += advanced.getMinWeight() == null && advanced.getMaxWeight() == null ? 0 : 1;
        count += advanced.getEducationCodes().isEmpty() ? 0 : 1;
        count += advanced.getHometowns().isEmpty() ? 0 : 1;
        count += advanced.getMajorNames().isEmpty() ? 0 : 1;
        return count;
    }

    private RecommendCityVO city(String code) {
        return new RecommendCityVO(code, profileDictionaryService.label(ProfileDictType.CHINA_REGION, code));
    }

    private Integer currentAge(AppUser user) {
        LocalDate birthday = user.getBirthday();
        return birthday == null ? user.getAge() : Period.between(birthday, LocalDate.now()).getYears();
    }

    private List<String> normalize(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return new LinkedHashSet<>(values.stream()
                .map(StrUtil::trim)
                .filter(StrUtil::isNotBlank)
                .toList()).stream().toList();
    }

    private List<String> parseList(String json) {
        if (StrUtil.isBlank(json)) {
            return List.of();
        }
        try {
            return JSONUtil.parseArray(json).toList(String.class);
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }

    private void applyNeighborCapability(RecommendPreferenceVO vo, List<String> targetCityCodes) {
        boolean available = neighborCityAvailable(targetCityCodes);
        vo.setNeighborCityAvailable(available);
        vo.setNeighborCityDisabledReason(available ? null : NEIGHBOR_CITY_DISABLED_REASON);
    }

    private boolean neighborCityAvailable(List<String> targetCityCodes) {
        Map<String, List<String>> mapping = neighborCityMapping();
        return targetCityCodes.stream().anyMatch(code -> !mapping.getOrDefault(code, List.of()).isEmpty());
    }

    private List<String> effectiveTargetCities(RecommendPreference preference) {
        List<String> targetCities = parseList(preference.getTargetCityCodes());
        if (!Integer.valueOf(1).equals(preference.getAllowNeighborCity())) {
            return targetCities;
        }
        Map<String, List<String>> mapping = neighborCityMapping();
        LinkedHashSet<String> effective = new LinkedHashSet<>(targetCities);
        targetCities.forEach(code -> effective.addAll(mapping.getOrDefault(code, List.of())));
        return new ArrayList<>(effective);
    }

    private Map<String, List<String>> neighborCityMapping() {
        AppConfig config = appConfigDao.selectByKey(NEIGHBOR_CITY_MAP_KEY);
        if (config == null || StrUtil.isBlank(config.getConfigValue())) {
            return Map.of();
        }
        try {
            cn.hutool.json.JSONObject json = JSONUtil.parseObj(config.getConfigValue());
            Map<String, List<String>> result = new LinkedHashMap<>();
            for (String key : json.keySet()) {
                List<String> neighbors = json.getJSONArray(key) == null
                        ? List.of() : normalize(json.getJSONArray(key).toList(String.class));
                if (!neighbors.isEmpty()) {
                    result.put(key, neighbors);
                }
            }
            return result;
        } catch (RuntimeException ignored) {
            // 运行配置异常时暂不扩展城市范围，保留用户已保存的开关状态。
            return Map.of();
        }
    }

    private BusinessException versionConflict() {
        return new BusinessException(409, "筛选条件已在其他设备更新，请刷新后重试");
    }
}

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
import com.spacetime.common.util.MunicipalityLocationCodes;
import com.spacetime.common.util.ProfileAgeFilter;
import com.spacetime.common.util.ProfileZodiac;
import com.spacetime.common.util.CityNeighborDefaults;
import com.spacetime.common.util.RecommendBrowseCycle;
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
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
import java.util.function.Predicate;
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
    private static final String BLURRED_REPLAY_AVATAR =
            "https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/7607b8cd85521572/avatar-liked-blurred.png";
    private static final String ISSUED_ACTION = "issued";
    private static final java.time.ZoneId BEIJING = java.time.ZoneId.of("Asia/Shanghai");

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
        boolean vipEffective = isVipEffective(userId);
        boolean advancedFilterEffective = hasEffectiveBenefit(userId, ADVANCED_FILTER_BENEFIT);
        if (preference == null) {
            return defaultPreference(user, vipEffective, advancedFilterEffective);
        }
        return toPreferenceVO(preference, vipEffective, advancedFilterEffective, false);
    }

    @Override
    @Transactional
    public RecommendPreferenceVO savePreferences(Long userId, RecommendPreferenceSaveReq req) {
        requireBrowsableUser(userId);
        validateRequest(req);
        validateDictionaries(req);
        boolean vipEffective = isVipEffective(userId);
        boolean advancedFilterEffective = hasEffectiveBenefit(userId, ADVANCED_FILTER_BENEFIT);
        if (!advancedFilterEffective && hasAdvanced(req)) {
            throw new BusinessException(403, "开通会员且高级筛选权益启用后可保存高级条件");
        }

        RecommendPreference existing = preferenceDao.selectByUserId(userId);
        if (existing == null) {
            if (req.getVersion() != 0) {
                throw versionConflict();
            }
            RecommendPreference created = toEntity(userId, req, 1, null);
            preferenceDao.insert(created);
            return toPreferenceVO(created, vipEffective, advancedFilterEffective, false);
        }
        if (!existing.getVersion().equals(req.getVersion())) {
            throw versionConflict();
        }
        RecommendPreference changed = toEntity(userId, req, existing.getVersion() + 1, existing);
        if (!advancedFilterEffective) {
            // 权益失效期间允许修改基础偏好，但保留已保存的高级条件供权益恢复后继续使用。
            changed.setMinHeight(existing.getMinHeight());
            changed.setMaxHeight(existing.getMaxHeight());
            changed.setMinWeight(existing.getMinWeight());
            changed.setMaxWeight(existing.getMaxWeight());
            changed.setEducationCodes(existing.getEducationCodes());
            changed.setHometowns(existing.getHometowns());
            changed.setSchoolCodes(existing.getSchoolCodes());
            changed.setMajorNames(existing.getMajorNames());
        }
        changed.setId(existing.getId());
        if (preferenceDao.updateByVersion(changed, existing.getVersion()) != 1) {
            throw versionConflict();
        }
        return toPreferenceVO(changed, vipEffective, advancedFilterEffective, false);
    }

    @Override
    @Transactional
    public RecommendCandidatePageVO getCandidates(Long userId, String cursor) {
        AppUser current = requireBrowsableUser(userId);
        boolean vipEffective = isVipEffective(userId);
        boolean advancedFilterEffective = hasEffectiveBenefit(userId, ADVANCED_FILTER_BENEFIT);
        RecommendPreference preference = resolvePreference(current);
        RecommendBrowseCycle cycle = RecommendBrowseCycle.current();
        int remaining = remainingBrowseCount(userId, vipEffective, cycle);

        RecommendCandidatePageVO result = new RecommendCandidatePageVO();
        result.setPreferenceVersion(preference.getVersion());
        result.setRemainingBrowseCount(remaining);
        result.setNextResetAt(cycle.nextResetAt());
        if (remaining == 0) {
            result.setItems(List.of());
            result.setWaitingReason("browse_limit");
            return result;
        }

        int resultLimit = Math.min(PAGE_SIZE, remaining);
        List<String> targetCities = parseList(preference.getTargetCityCodes());
        List<String> preferredCities = effectiveTargetCities(preference);
        List<String> neighborCities = preferredCities.stream()
                .filter(code -> !MunicipalityLocationCodes.matchesAny(targetCities, code)).toList();
        CandidatePhase phase = CandidatePhase.fromCursor(cursor);
        if (phase == CandidatePhase.NEIGHBOR && neighborCities.isEmpty()) {
            throw new BusinessException(409, "周边城市配置已更新，请刷新推荐");
        }
        Predicate<AppUser> preferredCandidate = preferredCandidateMatcher(
                preference, advancedFilterEffective, preferredCities);
        Set<Long> viewedCandidateIds = viewedCandidateIdsInCycle(userId, cycle);
        Set<Long> emittedCandidateIds = new LinkedHashSet<>();
        List<RecommendCandidateVO> items = new ArrayList<>();
        AppUser lastAccepted = null;
        String scanCursor = phase.scanCursor(cursor);
        String previousScanCursor = null;
        String continuationCursor = null;
        int scannedBatches = 0;
        while (items.size() < resultLimit && scannedBatches < MAX_CANDIDATE_SCAN_BATCHES) {
            LambdaQueryWrapper<AppUser> wrapper = candidateWrapper(
                    current, preference, advancedFilterEffective, scanCursor,
                    phase == CandidatePhase.NEIGHBOR ? neighborCities : targetCities, phase);
            List<AppUser> queried = safeUsers(appUserDao.selectList(wrapper));
            scannedBatches++;
            if (queried.isEmpty()) {
                phase = phase.next(!neighborCities.isEmpty());
                if (phase != null) {
                    scanCursor = null;
                    previousScanCursor = null;
                    continuationCursor = phase.cursor(null);
                    continue;
                }
                continuationCursor = null;
                break;
            }
            // 全池包含此前精确阶段的用户；按同一偏好语义排除，跨页预取也不会重复。
            List<AppUser> phaseCandidates = phase == CandidatePhase.FALLBACK
                    ? queried.stream().filter(preferredCandidate.negate()).toList() : queried;
            Map<Long, String> access = phaseCandidates.isEmpty()
                    ? Map.of() : accessProjectionService.projectAll(phaseCandidates);
            List<AppUser> openCandidates = phaseCandidates.stream()
                    .filter(candidate -> "OPEN".equals(access.get(candidate.getId())))
                    .toList();
            List<Long> openCandidateIds = openCandidates.stream().map(AppUser::getId).toList();
            Set<Long> blockedCandidateIds = blockedCandidateIds(userId, openCandidateIds);
            Set<Long> likedCandidateIds = activeLikedCandidateIds(userId, openCandidateIds);
            List<AppUser> visibleCandidates = openCandidates.stream()
                    .filter(candidate -> !emittedCandidateIds.contains(candidate.getId()))
                    .filter(candidate -> !blockedCandidateIds.contains(candidate.getId()))
                    .filter(candidate -> !likedCandidateIds.contains(candidate.getId()))
                    .filter(candidate -> !viewedCandidateIds.contains(candidate.getId()))
                    .limit(resultLimit - items.size())
                    .toList();
            Map<Long, PublicProfileVO> profiles = batchCandidateProfiles(
                    userId, visibleCandidates, likedCandidateIds);
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
                emittedCandidateIds.add(candidate.getId());
                lastAccepted = candidate;
            }

            if (items.size() >= resultLimit) {
                continuationCursor = phase.cursor(encodeCursor(lastAccepted));
                break;
            }
            if (queried.size() < CANDIDATE_SCAN_BATCH_SIZE) {
                phase = phase.next(!neighborCities.isEmpty());
                if (phase != null) {
                    scanCursor = null;
                    previousScanCursor = null;
                    continuationCursor = phase.cursor(null);
                    continue;
                }
                continuationCursor = null;
                break;
            }
            String nextScanCursor = encodeCursor(queried.getLast());
            if (Objects.equals(nextScanCursor, scanCursor)
                    || Objects.equals(nextScanCursor, previousScanCursor)) {
                throw new BusinessException(409, "推荐候选已更新，请刷新推荐");
            }
            continuationCursor = phase.cursor(nextScanCursor);
            if (scannedBatches >= MAX_CANDIDATE_SCAN_BATCHES) {
                break;
            }
            previousScanCursor = scanCursor;
            scanCursor = nextScanCursor;
        }
        result.setItems(items);
        result.setNextCursor(continuationCursor);
        result.setWaitingReason(items.isEmpty() && continuationCursor == null ? "no_candidate" : null);
        recordIssuedCandidates(userId, items, preference.getVersion(),
                RecommendBrowseCycle.current().currentTime());
        return result;
    }

    private void recordIssuedCandidates(Long userId, List<RecommendCandidateVO> items,
                                        Integer filterVersion, LocalDateTime issuedAt) {
        if (items.isEmpty()) {
            return;
        }
        LocalDate issueDate = issuedAt.toLocalDate();
        LocalDateTime dayStart = issueDate.atStartOfDay();
        List<Long> candidateIds = items.stream().map(RecommendCandidateVO::getUserId)
                .filter(Objects::nonNull).distinct().toList();
        if (candidateIds.isEmpty()) {
            return;
        }
        List<RecommendViewLog> existing = viewLogDao.selectList(
                new LambdaQueryWrapper<RecommendViewLog>()
                        .eq(RecommendViewLog::getUserId, userId)
                        .eq(RecommendViewLog::getAction, ISSUED_ACTION)
                        .in(RecommendViewLog::getCandidateUserId, candidateIds)
                        .ge(RecommendViewLog::getViewedAt, dayStart)
                        .lt(RecommendViewLog::getViewedAt, dayStart.plusDays(1)));
        Set<Long> issuedIds = (existing == null ? List.<RecommendViewLog>of() : existing).stream()
                .filter(log -> ISSUED_ACTION.equals(log.getAction()))
                .map(RecommendViewLog::getCandidateUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        for (int index = 0; index < items.size(); index++) {
            Long candidateId = items.get(index).getUserId();
            if (candidateId == null || !issuedIds.add(candidateId)) {
                continue;
            }
            String requestId = "issued:" + issueDate + ":" + userId + ":" + candidateId;
            RecommendViewLog issued = new RecommendViewLog();
            issued.setEventNo("RVL-" + IdUtil.getSnowflakeNextIdStr());
            issued.setRequestId(requestId);
            issued.setUserId(userId);
            issued.setCandidateUserId(candidateId);
            issued.setScene("recommend");
            issued.setFilterVersion(filterVersion);
            issued.setAction(ISSUED_ACTION);
            issued.setPosition(index + 1);
            issued.setViewedAt(issuedAt);
            try {
                viewLogDao.insert(issued);
            } catch (DuplicateKeyException duplicate) {
                // 同日并发请求可能同时发放同一人，只有发放键已存在时才视为幂等。
                if (viewLogDao.selectByRequestAction(userId, requestId, ISSUED_ACTION) == null) {
                    throw duplicate;
                }
            }
        }
    }

    /**
     * 批量构造推荐卡片所需公开资料。候选已经过准入、屏蔽和已喜欢过滤，因此这里只做展示投影，
     * 避免再次逐用户执行完整公开资料查询。
     */
    private Map<Long, PublicProfileVO> batchCandidateProfiles(Long currentUserId,
                                                               List<AppUser> candidates,
                                                               Set<Long> likedIds) {
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
            profile.setAge(ProfileAgeFilter.currentAge(candidate));
            profile.setHeight(candidate.getHeight());
            profile.setZodiac(ProfileZodiac.resolve(candidate));
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
        // 必须在首次普通读取前取得行锁，避免 MySQL 可重复读沿用并发扣减前的快照。
        // 锁由数据库事务释放；多设备和多个服务实例均共用同一额度保护。
        if ("view".equals(action)) {
            appUserDao.lockRecommendBrowse(userId);
        }
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
        RecommendBrowseCycle cycle = RecommendBrowseCycle.current();
        // 同一候选在本次中午至次日中午的周期内只扣一次浏览额度。
        if ("view".equals(action) && alreadyViewedInCycle(userId, candidateId, cycle)) {
            return;
        }
        if ("view".equals(action) && remainingBrowseCount(userId, isVipEffective(userId), cycle) == 0) {
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
        entity.setViewedAt(cycle.currentTime());
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
        boolean memberProfileAccess = hasEffectiveBenefit(userId, THREE_DAY_REPLAY_BENEFIT);
        LocalDateTime start = LocalDate.now(BEIJING).minusDays(2).atStartOfDay();
        List<RecommendViewLog> raw = viewLogDao.selectList(new LambdaQueryWrapper<RecommendViewLog>()
                .eq(RecommendViewLog::getUserId, userId)
                .ge(RecommendViewLog::getViewedAt, start)
                .in(RecommendViewLog::getAction, List.of("view", "skip", "detail", "like"))
                .orderByDesc(RecommendViewLog::getViewedAt));
        Map<ReplayDayCandidate, RecommendViewLog> latest = new LinkedHashMap<>();
        Set<ReplayDayCandidate> skipped = new LinkedHashSet<>();
        for (RecommendViewLog log : raw == null ? List.<RecommendViewLog>of() : raw) {
            if (List.of("view", "skip", "detail", "like").contains(log.getAction())
                    && log.getCandidateUserId() != null && log.getViewedAt() != null) {
                // 同一天的重复动作只保留最近一次；同一用户跨天出现时，三天回看应分别保留。
                ReplayDayCandidate key = new ReplayDayCandidate(
                        log.getViewedAt().toLocalDate(), log.getCandidateUserId());
                latest.putIfAbsent(key, log);
                if ("skip".equals(log.getAction())) {
                    skipped.add(key);
                }
            }
        }
        List<Long> candidateIds = latest.values().stream()
                .map(RecommendViewLog::getCandidateUserId)
                .distinct()
                .toList();
        if (candidateIds.isEmpty()) {
            RecommendReplayPageVO empty = new RecommendReplayPageVO();
            empty.setItems(List.of());
            empty.setMemberProfileAccess(memberProfileAccess);
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
            boolean pastDay = log.getViewedAt().toLocalDate().isBefore(LocalDate.now(BEIJING));
            String avatar = !memberProfileAccess && pastDay
                    ? BLURRED_REPLAY_AVATAR : avatars.get(target.getId());
            item.setProfile(replayProfile(target, avatar, cityLabels,
                    occupationLabels, liked));
            item.setViewedAt(log.getViewedAt());
            item.setLastAction(log.getAction());
            item.setDateGroup(dateGroup(log.getViewedAt()));
            item.setSkipped(skipped.contains(new ReplayDayCandidate(
                    log.getViewedAt().toLocalDate(), target.getId())));
            item.setLiked(liked);
            items.add(item);
        }
        RecommendReplayPageVO result = new RecommendReplayPageVO();
        result.setItems(items);
        result.setMemberProfileAccess(memberProfileAccess);
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
                isVipEffective(user.getId()),
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
                                                          boolean advancedFilterEffective,
                                                          String cursor, List<String> targetCities,
                                                          CandidatePhase phase) {
        String opposite = GenderEnum.MALE.getCode().equals(current.getGender())
                ? GenderEnum.FEMALE.getCode() : GenderEnum.MALE.getCode();
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<AppUser>()
                .ne(AppUser::getId, current.getId())
                .eq(AppUser::getGender, opposite)
                .eq(AppUser::getAccountStatus, AccountStatusEnum.NORMAL.getCode());
        if (phase != CandidatePhase.FALLBACK) {
            ProfileAgeFilter.apply(wrapper, preference.getMinAge(), preference.getMaxAge());
            MunicipalityLocationCodes.applyCityFilter(wrapper, targetCities);
        }
        if (phase != CandidatePhase.FALLBACK && advancedFilterEffective) {
            wrapper.ge(preference.getMinHeight() != null, AppUser::getHeight, preference.getMinHeight())
                    .le(preference.getMaxHeight() != null, AppUser::getHeight, preference.getMaxHeight())
                    .ge(preference.getMinWeight() != null, AppUser::getWeight, preference.getMinWeight())
                    .le(preference.getMaxWeight() != null, AppUser::getWeight, preference.getMaxWeight())
                    .in(!parseList(preference.getEducationCodes()).isEmpty(), AppUser::getEducationLevel,
                            parseList(preference.getEducationCodes()))
                    .in(!parseList(preference.getMajorNames()).isEmpty(), AppUser::getMajor,
                            parseList(preference.getMajorNames()));
            MunicipalityLocationCodes.applyHometownFilter(wrapper, parseList(preference.getHometowns()));
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

    private Predicate<AppUser> preferredCandidateMatcher(RecommendPreference preference,
                                                         boolean advancedFilterEffective,
                                                         List<String> cities) {
        List<String> education = parseList(preference.getEducationCodes());
        List<String> majors = parseList(preference.getMajorNames());
        List<String> hometowns = parseList(preference.getHometowns());
        return candidate -> matchesRange(ProfileAgeFilter.currentAge(candidate),
                preference.getMinAge(), preference.getMaxAge())
                && (cities.isEmpty() || MunicipalityLocationCodes.matchesAny(cities, candidate.getLocationCity()))
                && (!advancedFilterEffective || (
                matchesRange(candidate.getHeight(), preference.getMinHeight(), preference.getMaxHeight())
                && matchesRange(candidate.getWeight(), preference.getMinWeight(), preference.getMaxWeight())
                && (education.isEmpty() || education.contains(candidate.getEducationLevel()))
                && (majors.isEmpty() || majors.contains(candidate.getMajor()))
                && (hometowns.isEmpty() || MunicipalityLocationCodes.matchesAny(hometowns, candidate.getHometownCity()))));
    }

    private boolean matchesRange(Integer value, Integer minimum, Integer maximum) {
        return (minimum == null && maximum == null)
                || (value != null && (minimum == null || value >= minimum) && (maximum == null || value <= maximum));
    }

    /** 保持旧的精确/周边游标可用，新增全池候补阶段。 */
    private enum CandidatePhase {
        PREFERRED(""), NEIGHBOR("neighbor:"), FALLBACK("fallback:");

        private final String prefix;

        CandidatePhase(String prefix) {
            this.prefix = prefix;
        }

        static CandidatePhase fromCursor(String cursor) {
            if (cursor != null && cursor.startsWith(FALLBACK.prefix)) return FALLBACK;
            if (cursor != null && cursor.startsWith(NEIGHBOR.prefix)) return NEIGHBOR;
            return PREFERRED;
        }

        String scanCursor(String cursor) {
            return cursor == null ? null : cursor.substring(prefix.length());
        }

        String cursor(String scanCursor) {
            return prefix + (scanCursor == null ? "" : scanCursor);
        }

        CandidatePhase next(boolean hasNeighbors) {
            return switch (this) {
                case PREFERRED -> hasNeighbors ? NEIGHBOR : FALLBACK;
                case NEIGHBOR -> FALLBACK;
                case FALLBACK -> null;
            };
        }
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
        profile.setAge(ProfileAgeFilter.currentAge(target));
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

    private int remainingBrowseCount(Long userId, boolean vipEffective, RecommendBrowseCycle cycle) {
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
        List<RecommendViewLog> views = viewLogDao.selectList(browseViewsInCycle(userId, cycle));
        long uniqueCandidates = views == null ? 0 : views.stream()
                .map(RecommendViewLog::getCandidateUserId)
                .filter(Objects::nonNull)
                .distinct()
                .count();
        return (int) Math.max(0, quota - uniqueCandidates);
    }

    private boolean alreadyViewedInCycle(Long userId, Long candidateId, RecommendBrowseCycle cycle) {
        List<RecommendViewLog> views = viewLogDao.selectList(browseViewsInCycle(userId, cycle)
                .eq(RecommendViewLog::getCandidateUserId, candidateId));
        return views != null && !views.isEmpty();
    }

    private Set<Long> viewedCandidateIdsInCycle(Long userId, RecommendBrowseCycle cycle) {
        List<RecommendViewLog> views = viewLogDao.selectList(browseViewsInCycle(userId, cycle));
        return (views == null ? List.<RecommendViewLog>of() : views).stream()
                .map(RecommendViewLog::getCandidateUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private LambdaQueryWrapper<RecommendViewLog> browseViewsInCycle(Long userId, RecommendBrowseCycle cycle) {
        return new LambdaQueryWrapper<RecommendViewLog>()
                .eq(RecommendViewLog::getUserId, userId)
                .eq(RecommendViewLog::getAction, "view")
                .ge(RecommendViewLog::getViewedAt, cycle.start())
                .lt(RecommendViewLog::getViewedAt, cycle.nextResetAt());
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
        if (date.equals(LocalDate.now(BEIJING))) {
            return "今天";
        }
        if (date.equals(LocalDate.now(BEIJING).minusDays(1))) {
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

    private record ReplayDayCandidate(LocalDate date, Long candidateId) {
    }

    private record AuditContentKey(Long userId, String auditType) {
    }

    private RecommendPreferenceVO defaultPreference(AppUser user, boolean vipEffective,
                                                    boolean advancedFilterEffective) {
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
        vo.setAdvancedFilterEffective(advancedFilterEffective);
        vo.setAdvancedEffectiveCount(0);
        vo.setDefaulted(true);
        return vo;
    }

    private RecommendPreferenceVO toPreferenceVO(RecommendPreference entity,
                                                  boolean vipEffective,
                                                  boolean advancedFilterEffective,
                                                  boolean defaulted) {
        RecommendAdvancedFilterVO advanced = advancedFilterEffective
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
        vo.setAdvancedFilterEffective(advancedFilterEffective);
        vo.setAdvancedEffectiveCount(advancedFilterEffective ? advancedCount(advanced) : 0);
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
                ? previous == null || previous.getOnlyCertifiedUsers() == null
                        ? 0 : previous.getOnlyCertifiedUsers()
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
        return new RecommendCityVO(code, MunicipalityLocationCodes.displayName(code,
                profileDictionaryService.label(ProfileDictType.CHINA_REGION, code)));
    }

    private Integer currentAge(AppUser user) {
        return ProfileAgeFilter.currentAge(user);
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
        return targetCityCodes.stream().anyMatch(code -> !mapping.getOrDefault(
                MunicipalityLocationCodes.cityGroupCode(code), List.of()).isEmpty());
    }

    private List<String> effectiveTargetCities(RecommendPreference preference) {
        List<String> targetCities = parseList(preference.getTargetCityCodes());
        if (!Integer.valueOf(1).equals(preference.getAllowNeighborCity())) {
            return targetCities;
        }
        Map<String, List<String>> mapping = neighborCityMapping();
        LinkedHashSet<String> effective = new LinkedHashSet<>(targetCities);
        targetCities.forEach(code -> effective.addAll(mapping.getOrDefault(
                MunicipalityLocationCodes.cityGroupCode(code), List.of())));
        return new ArrayList<>(effective);
    }

    private Map<String, List<String>> neighborCityMapping() {
        Map<String, List<String>> defaults = CityNeighborDefaults.mapping();
        AppConfig config = appConfigDao.selectByKey(NEIGHBOR_CITY_MAP_KEY);
        if (config == null || CommonStatusEnum.DISABLED.getCode().equals(config.getStatus())
                || StrUtil.isBlank(config.getConfigValue())) {
            return defaults;
        }
        try {
            cn.hutool.json.JSONObject json = JSONUtil.parseObj(config.getConfigValue());
            Map<String, List<String>> result = new LinkedHashMap<>(defaults);
            for (String key : json.keySet()) {
                List<String> neighbors = json.getJSONArray(key) == null
                        ? List.of() : normalize(json.getJSONArray(key).toList(String.class));
                // 显式空数组用于关闭某城市扩展；空对象则沿用全国默认邻接。
                result.put(MunicipalityLocationCodes.cityGroupCode(key), neighbors);
            }
            return result;
        } catch (RuntimeException ignored) {
            // 配置格式异常时使用已校验的默认数据，不改写用户偏好。
            return defaults;
        }
    }

    private BusinessException versionConflict() {
        return new BusinessException(409, "筛选条件已在其他设备更新，请刷新后重试");
    }
}

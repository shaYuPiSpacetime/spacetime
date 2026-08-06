package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.IdealFilterSnapshotDao;
import com.spacetime.common.dao.IdealSnapshotCandidateDao;
import com.spacetime.common.dao.RecommendPreferenceDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.IdealFilterSnapshot;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.entity.RecommendPreference;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.IdealSearchReq;
import com.spacetime.miniapp.dto.response.IdealConditionSummaryVO;
import com.spacetime.miniapp.dto.response.IdealConditionVO;
import com.spacetime.miniapp.dto.response.IdealMetaVO;
import com.spacetime.miniapp.dto.response.IdealResultItemVO;
import com.spacetime.miniapp.dto.response.IdealResultPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchVO;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.dto.response.RecommendCityVO;
import com.spacetime.miniapp.service.IdealService;
import com.spacetime.miniapp.service.IdealUnlockService;
import com.spacetime.miniapp.service.MiniappPublicProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** PRD-08 理想型筛选、不可变快照和隐私结果实现。 */
@Service
@RequiredArgsConstructor
public class IdealServiceImpl implements IdealService {
    private static final int PAGE_SIZE = 20;
    private static final int SNAPSHOT_RETENTION_DAYS = 90;
    private static final String ACTIVE = "active";
    private static final String SAFE_BLUR_AVATAR =
            "https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/7607b8cd85521572/avatar-liked-blurred.png";
    private static final Set<String> INTEREST_TAGS = Set.of(
            "OUTDOOR_LOVER", "LOVE_TRAVEL", "MOVIE_LOVER", "FOODIE", "READING", "PET_LOVER",
            "RUNNING", "FITNESS", "HIKING", "CYCLING", "CITY_WALK", "SEA_LOVER",
            "MOUNTAIN_LOVER", "TRAVEL_MEMORY", "sports_habit", "likes_animals", "foodie",
            "travel_lover");
    private static final Set<String> RELATIONSHIP_TAGS = Set.of(
            "SERIOUS_RELATIONSHIP", "FAMILY_ORIENTED", "SLOW_RELATIONSHIP",
            "MARRIAGE_ORIENTED", "relationship_serious", "relationship_family",
            "relationship_slow", "relationship_marriage");

    private static final List<ConditionDefinition> CONDITIONS = List.of(
            condition("M08-IDEAL-height-165", "外在条件", "身高165+"),
            condition("M08-IDEAL-school-tier", "教育背景", "985/211"),
            condition("M08-IDEAL-doctor", "教育背景", "博士学历"),
            condition("M08-IDEAL-overseas", "教育背景", "留学海归"),
            condition("M08-IDEAL-alumni", "教育背景", "校友"),
            condition("M08-IDEAL-home-owner", "经济实力", "已购房"),
            condition("M08-IDEAL-car-owner", "经济实力", "已购车"),
            condition("M08-IDEAL-only-child", "家庭背景", "独生子女"),
            condition("M08-IDEAL-public-family", "家庭背景", "体制内家庭"),
            condition("M08-IDEAL-local", "家庭背景", "本地人"),
            condition("M08-IDEAL-sports", "兴趣爱好", "有运动习惯"),
            condition("M08-IDEAL-animals", "兴趣爱好", "喜欢小动物"),
            condition("M08-IDEAL-food", "兴趣爱好", "喜欢美食"),
            condition("M08-IDEAL-travel", "兴趣爱好", "喜欢旅行"),
            condition("M08-IDEAL-interest-similar", "兴趣爱好", "兴趣相似"),
            condition("M08-IDEAL-view-compatible", "感情与经历", "感情观相合"),
            condition("M08-IDEAL-marry-2y", "感情与经历", "想2年内结婚")
    );
    private static final Map<String, ConditionDefinition> CONDITION_MAP = CONDITIONS.stream()
            .collect(java.util.stream.Collectors.toUnmodifiableMap(ConditionDefinition::code, item -> item));

    private final AppUserDao appUserDao;
    private final RecommendPreferenceDao preferenceDao;
    private final IdealFilterSnapshotDao snapshotDao;
    private final IdealSnapshotCandidateDao snapshotCandidateDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final UserUnlockRecordDao unlockRecordDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final ProfileDictionaryService profileDictionaryService;
    private final MiniappPublicProfileService publicProfileService;
    private final IdealUnlockService idealUnlockService;

    @Override
    public IdealMetaVO getMeta(Long userId) {
        AppUser current = requireOpenUser(userId);
        RecommendPreference preference = requirePreference(current);
        IdealMetaVO result = new IdealMetaVO();
        result.setPreferenceVersion(preference.getVersion());
        result.setTargetCities(parseList(preference.getTargetCityCodes()).stream()
                .map(this::city).toList());
        result.setMinAge(preference.getMinAge());
        result.setMaxAge(preference.getMaxAge());
        result.setConditions(conditionVOs(current));
        Page<IdealFilterSnapshot> recent = snapshotDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<IdealFilterSnapshot>()
                        .eq(IdealFilterSnapshot::getUserId, userId)
                        .orderByDesc(IdealFilterSnapshot::getCreateTime)
                        .orderByDesc(IdealFilterSnapshot::getSnapshotNo));
        List<IdealFilterSnapshot> records = recent == null || recent.getRecords() == null
                ? List.of() : recent.getRecords();
        result.setLastConditionCodes(records.isEmpty()
                ? List.of() : parseList(records.get(0).getConditionCodes()));
        result.setHistoryCount(Math.min(recent == null ? 0L : recent.getTotal(), 20L));
        // 当前正式资料字典只维护国内省市。能力缺失必须显式下发，前端不可伪造海外地区。
        result.setOverseasAddressAvailable(false);
        result.setOverseasAddressDisabledReason("海外地区字典暂未配置");
        return result;
    }

    @Override
    @Transactional
    public IdealSearchVO search(Long userId, IdealSearchReq req) {
        AppUser current = requireOpenUser(userId);
        RecommendPreference preference = requirePreference(current);
        SearchValues values = validateSearch(current, preference, req);
        String digest = digest(values);
        IdealFilterSnapshot idempotent = snapshotDao.selectByUserAndRequestId(userId, req.getRequestId());
        if (idempotent != null) {
            if (!digest.equals(idempotent.getConditionDigest())) {
                throw new BusinessException(409, "请求幂等键已被其他筛选条件占用");
            }
            return searchVO(idempotent);
        }

        IdealFilterSnapshot snapshot = new IdealFilterSnapshot();
        snapshot.setSnapshotNo("IDS-" + IdUtil.getSnowflakeNextIdStr());
        snapshot.setUserId(userId);
        snapshot.setRequestId(req.getRequestId());
        snapshot.setConditionDigest(digest);
        snapshot.setPreferenceVersion(req.getPreferenceVersion());
        snapshot.setTargetCityCodes(JSONUtil.toJsonStr(values.cities()));
        snapshot.setMinAge(req.getMinAge());
        snapshot.setMaxAge(req.getMaxAge());
        snapshot.setConditionCodes(JSONUtil.toJsonStr(values.conditions()));
        snapshot.setConditionPayload(JSONUtil.toJsonStr(values.conditions().stream()
                .map(code -> Map.of("code", code,
                        "name", CONDITION_MAP.get(code).name(),
                        "category", CONDITION_MAP.get(code).category()))
                .toList()));
        snapshot.setResultCount(0);
        snapshot.setStatus(ACTIVE);
        snapshot.setExpiresAt(LocalDateTime.now().plusDays(SNAPSHOT_RETENTION_DAYS));
        snapshotDao.insert(snapshot);

        List<AppUser> queried = safeUsers(appUserDao.selectList(candidateWrapper(current, values)));
        Map<Long, String> access = accessProjectionService.projectAll(queried);
        List<IdealSnapshotCandidate> candidates = new ArrayList<>();
        for (AppUser candidate : queried) {
            if (!"OPEN".equals(access.get(candidate.getId()))
                    || isBlocked(userId, candidate.getId())
                    || !matchesAll(current, candidate, values)) {
                continue;
            }
            IdealSnapshotCandidate item = new IdealSnapshotCandidate();
            item.setSnapshotId(snapshot.getId());
            item.setItemNo("IDI-" + IdUtil.getSnowflakeNextIdStr());
            item.setCandidateUserId(candidate.getId());
            item.setSortTime(sortTime(candidate));
            item.setSortTieBreaker(String.valueOf(candidate.getId()));
            item.setMatchedConditionCodes(JSONUtil.toJsonStr(values.conditions()));
            candidates.add(item);
        }
        if (!candidates.isEmpty()) {
            snapshotCandidateDao.insertBatch(candidates);
        }
        snapshot.setResultCount(candidates.size());
        snapshotDao.updateById(snapshot);
        return searchVO(snapshot);
    }

    @Override
    public IdealResultPageVO getResults(Long userId, String snapshotNo, String cursor) {
        requireOpenUser(userId);
        IdealFilterSnapshot snapshot = requireActiveSnapshot(userId, snapshotNo);
        List<IdealSnapshotCandidate> all = snapshotCandidateDao.selectBySnapshotId(snapshot.getId());
        List<IdealSnapshotCandidate> ordered = all == null ? new ArrayList<>() : new ArrayList<>(all);
        ordered.sort(Comparator.comparing(IdealSnapshotCandidate::getSortTime,
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(IdealSnapshotCandidate::getSortTieBreaker,
                        Comparator.nullsLast(Comparator.naturalOrder())));
        int offset = decodeOffset(cursor);
        if (offset > ordered.size()) {
            throw new BusinessException(400, "理想型结果游标无效");
        }
        int end = Math.min(ordered.size(), offset + PAGE_SIZE);
        List<IdealSnapshotCandidate> page = ordered.subList(offset, end);
        Map<Long, UserUnlockRecord> unlocks = activeUnlocks(userId, ordered);
        List<IdealResultItemVO> items = new ArrayList<>();
        for (IdealSnapshotCandidate row : page) {
            AppUser candidate = appUserDao.selectById(row.getCandidateUserId());
            if (candidate == null || !"OPEN".equals(accessProjectionService.project(candidate))
                    || isBlocked(userId, candidate.getId())) {
                continue;
            }
            UserUnlockRecord unlock = unlocks.get(row.getCandidateUserId());
            if (unlock != null && active(unlock)) {
                PublicProfileVO profile = publicProfileService.getPublicProfile(userId, candidate.getId());
                IdealResultItemVO item = new IdealResultItemVO();
                item.setItemNo(row.getItemNo());
                item.setUnlocked(true);
                item.setCandidateNo(String.valueOf(candidate.getId()));
                item.setProfile(profile);
                item.setCommunicationMode("PRIVATE_MESSAGE");
                item.setUnlockExpiresAt(unlock.getExpireTime());
                item.setEducationLabel(profileDictionaryService.label(
                        ProfileDictType.EDUCATION_LEVEL, candidate.getEducationLevel()));
                item.setSchoolSummary(candidate.getSchool());
                items.add(item);
            } else {
                items.add(lockedItem(row, candidate));
            }
        }

        IdealResultPageVO result = new IdealResultPageVO();
        result.setSnapshotNo(snapshot.getSnapshotNo());
        result.setStatus(snapshot.getStatus());
        result.setSummary(summary(snapshot));
        result.setResultCount(snapshot.getResultCount());
        result.setUnlockableCount((int) ordered.stream()
                .map(IdealSnapshotCandidate::getCandidateUserId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .filter(targetUserId -> !unlocks.containsKey(targetUserId))
                .count());
        result.setItems(items);
        result.setNextCursor(end < ordered.size() ? encodeOffset(end) : null);
        result.setPricing(idealUnlockService.getPricing());
        return result;
    }

    private SearchValues validateSearch(AppUser current,
                                        RecommendPreference preference,
                                        IdealSearchReq req) {
        if (req == null || StrUtil.isBlank(req.getRequestId())
                || req.getPreferenceVersion() == null
                || req.getMinAge() == null || req.getMaxAge() == null
                || req.getMinAge() < 18 || req.getMaxAge() > 60
                || req.getMinAge() > req.getMaxAge()) {
            throw new BusinessException(400, "理想型筛选条件有误");
        }
        List<String> cities = normalize(req.getTargetCityCodes()).stream().sorted().toList();
        List<String> conditions = normalize(req.getConditionCodes()).stream().sorted().toList();
        if (cities.isEmpty() || cities.size() > 3 || conditions.size() > 17
                || !preference.getVersion().equals(req.getPreferenceVersion())
                || !new LinkedHashSet<>(parseList(preference.getTargetCityCodes()))
                .equals(new LinkedHashSet<>(cities))
                || !preference.getMinAge().equals(req.getMinAge())
                || !preference.getMaxAge().equals(req.getMaxAge())) {
            throw new BusinessException(409, "推荐偏好已变化，请刷新后重新筛选");
        }
        for (String city : cities) {
            profileDictionaryService.requireCode(ProfileDictType.CHINA_REGION, city, "目标城市");
        }
        Map<String, IdealConditionVO> availability = conditionVOs(current).stream()
                .collect(java.util.stream.Collectors.toMap(IdealConditionVO::getCode, item -> item));
        for (String code : conditions) {
            IdealConditionVO condition = availability.get(code);
            if (condition == null) {
                throw new BusinessException(400, "理想型条件不存在或已停用");
            }
            if (!Boolean.TRUE.equals(condition.getAvailable())) {
                throw new BusinessException(409, "先完善对应资料，再使用此理想型条件：" + condition.getName());
            }
        }
        return new SearchValues(cities, conditions, req.getMinAge(), req.getMaxAge());
    }

    private LambdaQueryWrapper<AppUser> candidateWrapper(AppUser current, SearchValues values) {
        String opposite = "MALE".equals(current.getGender()) ? "FEMALE" : "MALE";
        return new LambdaQueryWrapper<AppUser>()
                .ne(AppUser::getId, current.getId())
                .eq(AppUser::getGender, opposite)
                .eq(AppUser::getAccountStatus, AccountStatusEnum.NORMAL.getCode())
                .in(AppUser::getLocationCity, values.cities())
                .between(AppUser::getAge, values.minAge(), values.maxAge())
                .orderByDesc(AppUser::getLastLoginTime)
                .orderByAsc(AppUser::getId)
                .last("LIMIT 500");
    }

    private boolean matchesAll(AppUser current, AppUser candidate, SearchValues values) {
        if (candidate.getAge() == null || candidate.getAge() < values.minAge()
                || candidate.getAge() > values.maxAge()
                || !values.cities().contains(candidate.getLocationCity())) {
            return false;
        }
        for (String code : values.conditions()) {
            if (!matchesCondition(code, current, candidate, values.cities())) {
                return false;
            }
        }
        return true;
    }

    private boolean matchesCondition(String code, AppUser current, AppUser candidate, List<String> cities) {
        Set<String> tags = tags(candidate);
        return switch (code) {
            case "M08-IDEAL-height-165" -> candidate.getHeight() != null && candidate.getHeight() >= 165;
            case "M08-IDEAL-school-tier", "M08-IDEAL-alumni" -> false;
            case "M08-IDEAL-doctor" -> "DOCTOR".equalsIgnoreCase(candidate.getEducationLevel());
            case "M08-IDEAL-overseas" -> hasAny(tags, Set.of("overseas_returnee", "OVERSEAS_RETURNEE"));
            case "M08-IDEAL-home-owner" -> hasAny(tags, Set.of("home_owner", "HOME_OWNER"));
            case "M08-IDEAL-car-owner" -> hasAny(tags, Set.of("car_owner", "CAR_OWNER"));
            case "M08-IDEAL-only-child" -> hasAny(tags, Set.of("only_child", "ONLY_CHILD"));
            case "M08-IDEAL-public-family" -> hasAny(tags,
                    Set.of("public_sector_family", "PUBLIC_SECTOR_FAMILY"));
            // 现居城市已经是所有理想型结果的基础条件，不能再拿它判定“本地人”。
            // 当前资料模型尚无独立户籍城市字段，因此只使用家乡城市稳定编码。
            case "M08-IDEAL-local" -> cities.contains(candidate.getHometownCity());
            case "M08-IDEAL-sports" -> hasAny(tags,
                    Set.of("sports_habit", "RUNNING", "FITNESS", "HIKING", "CYCLING"));
            case "M08-IDEAL-animals" -> hasAny(tags, Set.of("likes_animals", "PET_LOVER"));
            case "M08-IDEAL-food" -> hasAny(tags, Set.of("foodie", "FOODIE"));
            case "M08-IDEAL-travel" -> hasAny(tags,
                    Set.of("travel_lover", "LOVE_TRAVEL", "TRAVEL_MEMORY"));
            case "M08-IDEAL-interest-similar" -> intersects(tags(current), tags, INTEREST_TAGS);
            case "M08-IDEAL-view-compatible" -> intersects(tags(current), tags, RELATIONSHIP_TAGS);
            case "M08-IDEAL-marry-2y" -> "ONE_TO_TWO_YEARS".equals(candidate.getDatingGoal());
            default -> false;
        };
    }

    private List<IdealConditionVO> conditionVOs(AppUser current) {
        Set<String> currentTags = tags(current);
        return CONDITIONS.stream().map(definition -> {
            String reason = switch (definition.code()) {
                case "M08-IDEAL-school-tier", "M08-IDEAL-alumni" -> "学校结构化数据暂未配置";
                case "M08-IDEAL-interest-similar" -> hasAny(currentTags, INTEREST_TAGS)
                        ? null : "请先完善兴趣标签";
                case "M08-IDEAL-view-compatible" -> hasAny(currentTags, RELATIONSHIP_TAGS)
                        ? null : "请先完善感情观标签";
                default -> null;
            };
            return new IdealConditionVO(definition.code(), definition.category(), definition.name(),
                    reason == null, reason);
        }).toList();
    }

    private RecommendPreference requirePreference(AppUser user) {
        RecommendPreference preference = preferenceDao.selectByUserId(user.getId());
        if (preference != null) {
            return preference;
        }
        if (user.getAge() == null || StrUtil.isBlank(user.getLocationCity())) {
            throw new BusinessException(409, "请先完善现居城市和出生日期");
        }
        RecommendPreference defaults = new RecommendPreference();
        defaults.setUserId(user.getId());
        defaults.setVersion(0);
        defaults.setTargetCityCodes(JSONUtil.toJsonStr(List.of(user.getLocationCity())));
        defaults.setAllowNeighborCity(0);
        defaults.setMinAge(Math.max(18, user.getAge() - 5));
        defaults.setMaxAge(Math.min(60, user.getAge() + 5));
        return defaults;
    }

    private AppUser requireOpenUser(Long userId) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(403, "完成资料和三项认证后即可使用理想型筛选");
        }
        return user;
    }

    private IdealFilterSnapshot requireActiveSnapshot(Long userId, String snapshotNo) {
        IdealFilterSnapshot snapshot = StrUtil.isBlank(snapshotNo) ? null : snapshotDao.selectBySnapshotNo(snapshotNo);
        if (snapshot == null || !userId.equals(snapshot.getUserId())) {
            throw new BusinessException(404, "理想型筛选记录不存在");
        }
        if (!ACTIVE.equals(snapshot.getStatus()) || snapshot.getExpiresAt() == null
                || !snapshot.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new BusinessException(410, "这次筛选记录已过期，请重新筛选");
        }
        return snapshot;
    }

    private IdealResultItemVO lockedItem(IdealSnapshotCandidate row, AppUser candidate) {
        IdealResultItemVO item = new IdealResultItemVO();
        item.setItemNo(row.getItemNo());
        item.setUnlocked(false);
        item.setBlurAvatarUrl(SAFE_BLUR_AVATAR);
        item.setAgeBand(ageBand(candidate.getAge()));
        item.setCityName(profileDictionaryService.label(ProfileDictType.CHINA_REGION,
                candidate.getLocationCity()));
        item.setEducationLabel(profileDictionaryService.label(ProfileDictType.EDUCATION_LEVEL,
                candidate.getEducationLevel()));
        item.setSchoolSummary("学校信息解锁后可见");
        item.setMatchedConditionNames(parseList(row.getMatchedConditionCodes()).stream()
                .map(CONDITION_MAP::get)
                .filter(java.util.Objects::nonNull)
                .map(ConditionDefinition::name)
                .toList());
        return item;
    }

    private IdealConditionSummaryVO summary(IdealFilterSnapshot snapshot) {
        IdealConditionSummaryVO summary = new IdealConditionSummaryVO();
        summary.setTargetCities(parseList(snapshot.getTargetCityCodes()).stream().map(this::city).toList());
        summary.setMinAge(snapshot.getMinAge());
        summary.setMaxAge(snapshot.getMaxAge());
        summary.setConditionNames(parseList(snapshot.getConditionCodes()).stream()
                .map(CONDITION_MAP::get)
                .filter(java.util.Objects::nonNull)
                .map(ConditionDefinition::name)
                .toList());
        return summary;
    }

    private Map<Long, UserUnlockRecord> activeUnlocks(Long userId,
                                                       List<IdealSnapshotCandidate> candidates) {
        Map<Long, UserUnlockRecord> result = new LinkedHashMap<>();
        for (IdealSnapshotCandidate candidate : candidates == null
                ? List.<IdealSnapshotCandidate>of() : candidates) {
            Long targetUserId = candidate.getCandidateUserId();
            if (targetUserId == null || result.containsKey(targetUserId)) {
                continue;
            }
            UserUnlockRecord record = unlockRecordDao.selectActiveByTargetUser(
                    userId, "ideal", targetUserId);
            if (active(record)) {
                result.put(targetUserId, record);
            }
        }
        return result;
    }

    private boolean active(UserUnlockRecord record) {
        return record != null && UnlockRecordStatusEnum.ACTIVE.getCode().equals(record.getStatus())
                && Integer.valueOf(1).equals(record.getActiveMarker())
                && (record.getExpireTime() == null || record.getExpireTime().isAfter(LocalDateTime.now()));
    }

    private boolean isBlocked(Long userId, Long candidateId) {
        return relationBlockDao.selectActive(userId, candidateId,
                RelationBlockTypeEnum.BLACKLIST.getCode()) != null
                || relationBlockDao.selectActive(candidateId, userId,
                RelationBlockTypeEnum.BLACKLIST.getCode()) != null
                || relationBlockDao.selectActive(userId, candidateId,
                RelationBlockTypeEnum.NO_RECOMMEND.getCode()) != null;
    }

    private String digest(SearchValues values) {
        LinkedHashMap<String, Object> canonical = new LinkedHashMap<>();
        canonical.put("cities", values.cities());
        canonical.put("conditions", values.conditions());
        canonical.put("minAge", values.minAge());
        canonical.put("maxAge", values.maxAge());
        return sha256(JSONUtil.toJsonStr(canonical));
    }

    private String sha256(String value) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("当前运行环境不支持 SHA-256", e);
        }
    }

    private IdealSearchVO searchVO(IdealFilterSnapshot snapshot) {
        IdealSearchVO result = new IdealSearchVO();
        result.setSnapshotNo(snapshot.getSnapshotNo());
        result.setResultCount(snapshot.getResultCount());
        result.setExpiresAt(snapshot.getExpiresAt());
        return result;
    }

    private RecommendCityVO city(String code) {
        return new RecommendCityVO(code,
                profileDictionaryService.label(ProfileDictType.CHINA_REGION, code));
    }

    private String ageBand(Integer age) {
        if (age == null) {
            return "年龄保密";
        }
        if (age < 20) {
            return "18-19岁";
        }
        int lower = age / 5 * 5;
        return lower + "-" + (lower + 4) + "岁";
    }

    private int decodeOffset(String cursor) {
        if (StrUtil.isBlank(cursor)) {
            return 0;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!raw.startsWith("ideal-offset:")) {
                throw new IllegalArgumentException();
            }
            return Integer.parseInt(raw.substring("ideal-offset:".length()));
        } catch (RuntimeException ignored) {
            throw new BusinessException(400, "理想型结果游标无效");
        }
    }

    private String encodeOffset(int offset) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("ideal-offset:" + offset).getBytes(StandardCharsets.UTF_8));
    }

    private Set<String> tags(AppUser user) {
        return new LinkedHashSet<>(parseList(user == null ? null : user.getTags()));
    }

    private boolean hasAny(Set<String> values, Set<String> expected) {
        return values.stream().anyMatch(expected::contains);
    }

    private boolean intersects(Set<String> left, Set<String> right, Set<String> scope) {
        return left.stream().filter(scope::contains).anyMatch(right::contains);
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

    private List<AppUser> safeUsers(List<AppUser> users) {
        return users == null ? List.of() : users;
    }

    private LocalDateTime sortTime(AppUser user) {
        if (user.getLastLoginTime() != null) {
            return user.getLastLoginTime();
        }
        if (user.getUpdateTime() != null) {
            return user.getUpdateTime();
        }
        return LocalDateTime.of(1970, 1, 1, 0, 0);
    }

    private static ConditionDefinition condition(String code, String category, String name) {
        return new ConditionDefinition(code, category, name);
    }

    private record ConditionDefinition(String code, String category, String name) {
    }

    private record SearchValues(List<String> cities, List<String> conditions,
                                Integer minAge, Integer maxAge) {
    }
}

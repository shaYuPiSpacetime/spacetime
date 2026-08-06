package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.RecommendPreferenceDao;
import com.spacetime.common.dao.RecommendViewLogDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.RecommendPreference;
import com.spacetime.common.entity.RecommendViewLog;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.GenderEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
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
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.dto.response.VipBenefitVO;
import com.spacetime.miniapp.service.MiniappPublicProfileService;
import com.spacetime.miniapp.service.RecommendService;
import com.spacetime.miniapp.service.VipService;
import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Base64;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** 推荐业务服务实现。 */
@Service
@RequiredArgsConstructor
public class RecommendServiceImpl implements RecommendService {
    private static final int DEFAULT_MIN_AGE = 18;
    private static final int DEFAULT_MAX_AGE = 60;
    private static final int PAGE_SIZE = 20;
    private static final Set<String> ACTIONS = Set.of("view", "detail", "skip", "like", "never");
    private static final String NORMAL_QUOTA_KEY = "commercial.view.quota.normal";
    private static final String VIP_QUOTA_KEY = "commercial.view.quota.vip";
    private static final String ADVANCED_FILTER_BENEFIT = "advanced_filter";
    private static final String THREE_DAY_REPLAY_BENEFIT = "three_day_replay";
    private static final String NEIGHBOR_CITY_MAP_KEY = "prd08.recommend.neighbor-city-map";
    private static final String NEIGHBOR_CITY_DISABLED_REASON = "周边城市关系暂未配置";

    private final AppUserDao appUserDao;
    private final RecommendPreferenceDao preferenceDao;
    private final UserAssetDao userAssetDao;
    private final AppConfigDao appConfigDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final RecommendViewLogDao viewLogDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final ProfileDictionaryService profileDictionaryService;
    private final MiniappPublicProfileService publicProfileService;
    private final VipService vipService;

    @Override
    public RecommendPreferenceVO getPreferences(Long userId) {
        AppUser user = requireOpenUser(userId);
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
        requireOpenUser(userId);
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
            RecommendPreference created = toEntity(userId, req, 1);
            preferenceDao.insert(created);
            return toPreferenceVO(created, vipEffective, false);
        }
        if (!existing.getVersion().equals(req.getVersion())) {
            throw versionConflict();
        }
        RecommendPreference changed = toEntity(userId, req, existing.getVersion() + 1);
        changed.setId(existing.getId());
        if (preferenceDao.updateByVersion(changed, existing.getVersion()) != 1) {
            throw versionConflict();
        }
        return toPreferenceVO(changed, vipEffective, false);
    }

    @Override
    public RecommendCandidatePageVO getCandidates(Long userId, String cursor) {
        AppUser current = requireOpenUser(userId);
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

        LambdaQueryWrapper<AppUser> wrapper = candidateWrapper(current, preference, vipEffective, cursor);
        List<AppUser> queried = safeUsers(appUserDao.selectList(wrapper));
        Map<Long, String> access = accessProjectionService.projectAll(queried);
        List<RecommendCandidateVO> items = new ArrayList<>();
        for (AppUser candidate : queried) {
            if (items.size() >= PAGE_SIZE) {
                break;
            }
            if (!"OPEN".equals(access.get(candidate.getId())) || isBlocked(userId, candidate.getId())) {
                continue;
            }
            try {
                PublicProfileVO profile = publicProfileService.getPublicProfile(userId, candidate.getId());
                RecommendCandidateVO item = new RecommendCandidateVO();
                item.setCandidateNo(String.valueOf(candidate.getId()));
                item.setUserId(candidate.getId());
                item.setProfile(profile);
                item.setLiked(Boolean.TRUE.equals(profile.getLiked()));
                item.setCommunicationMode(profile.getCommunicationMode());
                item.setActualCity(profileDictionaryService.label(ProfileDictType.CHINA_REGION,
                        candidate.getLocationCity()));
                items.add(item);
            } catch (BusinessException ignored) {
                // 候选在列表查询后失效时直接剔除，不向用户暴露原因。
            }
        }
        result.setItems(items);
        result.setWaitingReason(items.isEmpty() ? "no_candidate" : null);
        if (items.size() == PAGE_SIZE) {
            AppUser last = queried.stream()
                    .filter(item -> item.getId().equals(items.get(items.size() - 1).getUserId()))
                    .findFirst().orElse(null);
            result.setNextCursor(last == null ? null : encodeCursor(last));
        }
        return result;
    }

    @Override
    @Transactional
    public void recordAction(Long userId, String candidateNo, String action, RecommendViewActionReq req) {
        requireOpenUser(userId);
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
        requireOpenUser(userId);
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
            latest.putIfAbsent(log.getCandidateUserId(), log);
        }
        List<RecommendReplayItemVO> items = new ArrayList<>();
        for (RecommendViewLog log : latest.values()) {
            AppUser target = appUserDao.selectById(log.getCandidateUserId());
            if (target == null || !"OPEN".equals(accessProjectionService.project(target))
                    || isBlocked(userId, target.getId())) {
                continue;
            }
            try {
                PublicProfileVO profile = publicProfileService.getPublicProfile(userId, target.getId());
                RecommendReplayItemVO item = new RecommendReplayItemVO();
                item.setCandidateNo(String.valueOf(target.getId()));
                item.setProfile(profile);
                item.setViewedAt(log.getViewedAt());
                item.setLastAction(log.getAction());
                item.setDateGroup(dateGroup(log.getViewedAt()));
                item.setLiked(Boolean.TRUE.equals(profile.getLiked()));
                items.add(item);
            } catch (BusinessException ignored) {
                // 实时失效候选不进入回看响应。
            }
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
                .last("LIMIT 60");
    }

    private boolean isBlocked(Long userId, Long candidateId) {
        return relationBlockDao.selectActive(userId, candidateId,
                RelationBlockTypeEnum.BLACKLIST.getCode()) != null
                || relationBlockDao.selectActive(candidateId, userId,
                RelationBlockTypeEnum.BLACKLIST.getCode()) != null
                || relationBlockDao.selectActive(userId, candidateId,
                RelationBlockTypeEnum.NO_RECOMMEND.getCode()) != null;
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

    private RecommendPreferenceVO defaultPreference(AppUser user, boolean vipEffective) {
        Integer age = currentAge(user);
        if (age == null || StrUtil.isBlank(user.getLocationCity())) {
            throw new BusinessException(409, "请先完善现居城市和出生日期");
        }
        RecommendPreferenceVO vo = new RecommendPreferenceVO();
        vo.setVersion(0);
        vo.setTargetCities(List.of(city(user.getLocationCity())));
        vo.setAllowNeighborCity(false);
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

        RecommendPreferenceVO vo = new RecommendPreferenceVO();
        vo.setVersion(entity.getVersion());
        List<String> targetCityCodes = parseList(entity.getTargetCityCodes());
        vo.setTargetCities(targetCityCodes.stream().map(this::city).toList());
        applyNeighborCapability(vo, targetCityCodes);
        vo.setAllowNeighborCity(Boolean.TRUE.equals(vo.getNeighborCityAvailable())
                && Integer.valueOf(1).equals(entity.getAllowNeighborCity()));
        vo.setMinAge(entity.getMinAge());
        vo.setMaxAge(entity.getMaxAge());
        vo.setAdvanced(advanced);
        vo.setVipEffective(vipEffective);
        vo.setAdvancedEffectiveCount(vipEffective ? advancedCount(advanced) : 0);
        vo.setDefaulted(defaulted);
        return vo;
    }

    private RecommendPreference toEntity(Long userId, RecommendPreferenceSaveReq req, int version) {
        RecommendPreference entity = new RecommendPreference();
        entity.setUserId(userId);
        entity.setTargetCityCodes(JSONUtil.toJsonStr(normalize(req.getTargetCityCodes())));
        entity.setAllowNeighborCity(Boolean.TRUE.equals(req.getAllowNeighborCity())
                && neighborCityAvailable(normalize(req.getTargetCityCodes())) ? 1 : 0);
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
        if (min == null || max == null || min < lower || max > upper || min > max) {
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
        int count = advanced.getMinHeight() == null ? 0 : 1;
        count += advanced.getMinWeight() == null ? 0 : 1;
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
            // 运行配置异常时按正式口径降级关闭开关，不能猜测城市邻接关系。
            return Map.of();
        }
    }

    private BusinessException versionConflict() {
        return new BusinessException(409, "筛选条件已在其他设备更新，请刷新后重试");
    }
}

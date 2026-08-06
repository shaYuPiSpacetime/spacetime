package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.IdealFilterSnapshotDao;
import com.spacetime.common.dao.IdealSnapshotCandidateDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.IdealFilterSnapshot;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.response.IdealConditionSummaryVO;
import com.spacetime.miniapp.dto.response.IdealHelpVO;
import com.spacetime.miniapp.dto.response.IdealSearchRecordPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchRecordVO;
import com.spacetime.miniapp.dto.response.IdealUnlockRecordPageVO;
import com.spacetime.miniapp.dto.response.IdealUnlockRecordVO;
import com.spacetime.miniapp.dto.response.RecommendCityVO;
import com.spacetime.miniapp.service.IdealHistoryService;
import com.spacetime.miniapp.service.IdealUnlockService;
import com.spacetime.miniapp.service.MiniappPublicProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** PRD-08 理想型历史和帮助接口实现。 */
@Service
@RequiredArgsConstructor
public class IdealHistoryServiceImpl implements IdealHistoryService {
    private static final int SEARCH_PAGE_SIZE = 10;
    private static final int SEARCH_HISTORY_LIMIT = 20;
    private static final int UNLOCK_PAGE_SIZE = 20;
    private static final Map<String, String> CONDITION_NAMES = conditionNames();

    private final IdealFilterSnapshotDao snapshotDao;
    private final IdealSnapshotCandidateDao snapshotCandidateDao;
    private final UserUnlockRecordDao unlockRecordDao;
    private final AppUserDao appUserDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final AppConfigDao appConfigDao;
    private final ProfileDictionaryService profileDictionaryService;
    private final RelationAccessProjectionService accessProjectionService;
    private final MiniappPublicProfileService publicProfileService;
    private final IdealUnlockService idealUnlockService;

    @Override
    public IdealSearchRecordPageVO searchRecords(Long userId, String cursor) {
        requireOpenUser(userId);
        int offset = decodeCursor(cursor, "ideal-search:", SEARCH_PAGE_SIZE);
        if (offset >= SEARCH_HISTORY_LIMIT) {
            throw new BusinessException(400, "筛选记录游标无效");
        }
        Page<IdealFilterSnapshot> page = snapshotDao.selectPage(
                new Page<>(offset / SEARCH_PAGE_SIZE + 1L, SEARCH_PAGE_SIZE),
                new LambdaQueryWrapper<IdealFilterSnapshot>()
                        .eq(IdealFilterSnapshot::getUserId, userId)
                        .orderByDesc(IdealFilterSnapshot::getCreateTime)
                        .orderByDesc(IdealFilterSnapshot::getSnapshotNo));
        List<IdealFilterSnapshot> records = page == null || page.getRecords() == null
                ? List.of() : page.getRecords();
        long total = Math.min(page == null ? 0L : page.getTotal(), SEARCH_HISTORY_LIMIT);
        IdealSearchRecordPageVO result = new IdealSearchRecordPageVO();
        result.setItems(records.stream().map(this::searchRecord).toList());
        int nextOffset = offset + records.size();
        result.setNextCursor(nextOffset < total ? encodeCursor("ideal-search:", nextOffset) : null);
        result.setTotal(total);
        return result;
    }

    @Override
    public IdealUnlockRecordPageVO unlockRecords(Long userId, String status, String cursor) {
        requireOpenUser(userId);
        String normalizedStatus = StrUtil.blankToDefault(status, "all");
        if (!List.of("all", "active", "inactive").contains(normalizedStatus)) {
            throw new BusinessException(400, "解锁记录状态参数无效");
        }
        int offset = decodeCursor(cursor, "ideal-unlock:", UNLOCK_PAGE_SIZE);
        LocalDateTime now = LocalDateTime.now();
        LambdaQueryWrapper<UserUnlockRecord> wrapper = new LambdaQueryWrapper<UserUnlockRecord>()
                .eq(UserUnlockRecord::getUserId, userId)
                .eq(UserUnlockRecord::getTargetBizType, "ideal");
        if ("active".equals(normalizedStatus)) {
            wrapper.eq(UserUnlockRecord::getStatus, UnlockRecordStatusEnum.ACTIVE.getCode())
                    .eq(UserUnlockRecord::getActiveMarker, 1)
                    .and(nested -> nested.isNull(UserUnlockRecord::getExpireTime)
                            .or().gt(UserUnlockRecord::getExpireTime, now));
        } else if ("inactive".equals(normalizedStatus)) {
            wrapper.and(nested -> nested.ne(UserUnlockRecord::getStatus,
                            UnlockRecordStatusEnum.ACTIVE.getCode())
                    .or().isNull(UserUnlockRecord::getActiveMarker)
                    .or().le(UserUnlockRecord::getExpireTime, now));
        }
        wrapper.orderByDesc(UserUnlockRecord::getEffectiveTime)
                .orderByDesc(UserUnlockRecord::getId);
        Page<UserUnlockRecord> page = unlockRecordDao.selectPage(
                new Page<>(offset / UNLOCK_PAGE_SIZE + 1L, UNLOCK_PAGE_SIZE), wrapper);
        List<UserUnlockRecord> records = page == null || page.getRecords() == null
                ? List.of() : page.getRecords();
        IdealUnlockRecordPageVO result = new IdealUnlockRecordPageVO();
        result.setItems(records.stream().map(record -> unlockRecord(userId, record, now)).toList());
        long total = page == null ? 0L : page.getTotal();
        int nextOffset = offset + records.size();
        result.setNextCursor(nextOffset < total ? encodeCursor("ideal-unlock:", nextOffset) : null);
        result.setTotal(total);
        return result;
    }

    @Override
    public IdealHelpVO help(Long userId) {
        requireOpenUser(userId);
        var pricing = idealUnlockService.getPricing();
        IdealHelpVO result = new IdealHelpVO();
        result.setTitle("什么是理想型？");
        result.setIntro(configText("content.ideal.help.intro",
                "旨在帮助您精准找到符合您择偶需求的嘉宾。"));
        result.setResultDescription(configText("content.ideal.help.result",
                "您可以在理想型选择页内，随心选择您希望对方满足的标签，请您至少选择一个，上不封顶。"
                        + "标签选项可能定期更新，您可以多加关注、定期进入选择页更新筛选。"
                        + "系统将根据您当前所选择的标签，为您智能推荐匹配度高的嘉宾。\n"
                        + "列表内嘉宾卡片上会展示嘉宾的基础信息（包括现居地、年龄、学历背景等）及其优质标签。"));
        result.setUnlockDescription(configText("content.ideal.help.unlock",
                "您可以挑选感兴趣的嘉宾进行解锁（"
                        + Objects.requireNonNullElse(pricing.getUnitPrice(), 0)
                        + "千寻币/位），一次性解锁当前列表内全部（可享受"
                        + discountRate(pricing.getDiscountPercent())
                        + "折优惠）。可能不定期推出优惠活动，具体价格请以页面内展示为准。"));
        result.setPricing(pricing);
        return result;
    }

    private String discountRate(Integer discountPercent) {
        int rate = 100 - Math.max(0, Math.min(100, Objects.requireNonNullElse(discountPercent, 0)));
        return rate % 10 == 0 ? String.valueOf(rate / 10) : rate / 10 + "." + rate % 10;
    }

    private IdealSearchRecordVO searchRecord(IdealFilterSnapshot snapshot) {
        IdealSearchRecordVO result = new IdealSearchRecordVO();
        result.setSnapshotNo(snapshot.getSnapshotNo());
        result.setSummary(summary(snapshot));
        result.setResultCount(snapshot.getResultCount());
        result.setStatus(snapshot.getExpiresAt() != null && snapshot.getExpiresAt().isAfter(LocalDateTime.now())
                && "active".equals(snapshot.getStatus()) ? "active" : "expired");
        result.setCreatedAt(snapshot.getCreateTime());
        result.setExpiresAt(snapshot.getExpiresAt());
        return result;
    }

    private IdealUnlockRecordVO unlockRecord(Long currentUserId,
                                             UserUnlockRecord record,
                                             LocalDateTime now) {
        boolean active = UnlockRecordStatusEnum.ACTIVE.getCode().equals(record.getStatus())
                && Integer.valueOf(1).equals(record.getActiveMarker())
                && (record.getExpireTime() == null || record.getExpireTime().isAfter(now));
        IdealUnlockRecordVO result = new IdealUnlockRecordVO();
        result.setUnlockNo(record.getUnlockNo());
        result.setScene("理想型");
        result.setSnapshotNo(record.getSnapshotNo());
        result.setItemNo(record.getSnapshotItemNo());
        result.setUnlockedAt(record.getEffectiveTime());
        result.setExpiresAt(record.getExpireTime());
        result.setStatus(active ? "active" : expiredStatus(record));
        result.setCost(record.getCoinCost());
        if (!active) {
            result.setAvailable(false);
            return result;
        }
        AppUser target = appUserDao.selectById(record.getTargetUserId());
        boolean available = target != null && "OPEN".equals(accessProjectionService.project(target))
                && !blocked(currentUserId, record.getTargetUserId());
        result.setAvailable(available);
        if (available) {
            result.setProfile(publicProfileService.getPublicProfile(currentUserId, record.getTargetUserId()));
            result.setCommunicationMode("PRIVATE_MESSAGE");
            result.setEducationLabel(profileDictionaryService.label(
                    ProfileDictType.EDUCATION_LEVEL, target.getEducationLevel()));
            result.setSchoolSummary(target.getSchool());
            result.setMatchedConditionNames(matchedConditionNames(record));
        }
        return result;
    }

    private List<String> matchedConditionNames(UserUnlockRecord record) {
        if (StrUtil.isBlank(record.getSnapshotNo()) || StrUtil.isBlank(record.getSnapshotItemNo())) {
            return List.of();
        }
        IdealFilterSnapshot snapshot = snapshotDao.selectBySnapshotNo(record.getSnapshotNo());
        if (snapshot == null || snapshot.getId() == null) {
            return List.of();
        }
        List<IdealSnapshotCandidate> candidates = snapshotCandidateDao.selectBySnapshotId(snapshot.getId());
        if (candidates == null) {
            return List.of();
        }
        return candidates.stream()
                .filter(candidate -> record.getSnapshotItemNo().equals(candidate.getItemNo()))
                .findFirst()
                .map(candidate -> parseList(candidate.getMatchedConditionCodes()).stream()
                        .map(CONDITION_NAMES::get)
                        .filter(Objects::nonNull)
                        .toList())
                .orElseGet(List::of);
    }

    private String expiredStatus(UserUnlockRecord record) {
        return UnlockRecordStatusEnum.REFUNDED.getCode().equals(record.getStatus())
                ? UnlockRecordStatusEnum.REFUNDED.getCode() : UnlockRecordStatusEnum.EXPIRED.getCode();
    }

    private boolean blocked(Long userId, Long targetUserId) {
        return relationBlockDao.selectActive(userId, targetUserId,
                RelationBlockTypeEnum.BLACKLIST.getCode()) != null
                || relationBlockDao.selectActive(targetUserId, userId,
                RelationBlockTypeEnum.BLACKLIST.getCode()) != null;
    }

    private IdealConditionSummaryVO summary(IdealFilterSnapshot snapshot) {
        IdealConditionSummaryVO result = new IdealConditionSummaryVO();
        result.setTargetCities(parseList(snapshot.getTargetCityCodes()).stream()
                .map(code -> new RecommendCityVO(code,
                        profileDictionaryService.label(ProfileDictType.CHINA_REGION, code)))
                .toList());
        result.setMinAge(snapshot.getMinAge());
        result.setMaxAge(snapshot.getMaxAge());
        result.setConditionNames(parseList(snapshot.getConditionCodes()).stream()
                .map(CONDITION_NAMES::get).filter(Objects::nonNull).toList());
        return result;
    }

    private AppUser requireOpenUser(Long userId) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(403, "完成资料和三项认证后即可使用理想型功能");
        }
        return user;
    }

    private String configText(String key, String defaultValue) {
        AppConfig config = appConfigDao.selectByKey(key);
        if (config == null || !CommonStatusEnum.ENABLED.getCode().equals(config.getStatus())
                || StrUtil.isBlank(config.getConfigValue())) {
            return defaultValue;
        }
        return config.getConfigValue();
    }

    private int decodeCursor(String cursor, String prefix, int pageSize) {
        if (StrUtil.isBlank(cursor)) {
            return 0;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            if (!raw.startsWith(prefix)) {
                throw new IllegalArgumentException();
            }
            int offset = Integer.parseInt(raw.substring(prefix.length()));
            if (offset < 0 || offset % pageSize != 0) {
                throw new IllegalArgumentException();
            }
            return offset;
        } catch (RuntimeException ex) {
            throw new BusinessException(400, "分页游标无效");
        }
    }

    private String encodeCursor(String prefix, int offset) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                (prefix + offset).getBytes(StandardCharsets.UTF_8));
    }

    private List<String> parseList(String json) {
        if (StrUtil.isBlank(json)) {
            return List.of();
        }
        try {
            return JSONUtil.parseArray(json).toList(String.class);
        } catch (RuntimeException ex) {
            return List.of();
        }
    }

    private static Map<String, String> conditionNames() {
        Map<String, String> result = new LinkedHashMap<>();
        result.put("M08-IDEAL-height-165", "身高165+");
        result.put("M08-IDEAL-school-tier", "985/211");
        result.put("M08-IDEAL-doctor", "博士学历");
        result.put("M08-IDEAL-overseas", "留学海归");
        result.put("M08-IDEAL-alumni", "校友");
        result.put("M08-IDEAL-home-owner", "已购房");
        result.put("M08-IDEAL-car-owner", "已购车");
        result.put("M08-IDEAL-only-child", "独生子女");
        result.put("M08-IDEAL-public-family", "体制内家庭");
        result.put("M08-IDEAL-local", "本地人");
        result.put("M08-IDEAL-sports", "有运动习惯");
        result.put("M08-IDEAL-animals", "喜欢小动物");
        result.put("M08-IDEAL-food", "喜欢美食");
        result.put("M08-IDEAL-travel", "喜欢旅行");
        result.put("M08-IDEAL-interest-similar", "兴趣相似");
        result.put("M08-IDEAL-view-compatible", "感情观相合");
        result.put("M08-IDEAL-marry-2y", "想2年内结婚");
        return Map.copyOf(result);
    }
}

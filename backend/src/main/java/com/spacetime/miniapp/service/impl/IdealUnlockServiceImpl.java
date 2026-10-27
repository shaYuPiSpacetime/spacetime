package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.IdealFilterSnapshotDao;
import com.spacetime.common.dao.IdealSnapshotCandidateDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.IdealFilterSnapshot;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.IdealUnlockAllQuoteReq;
import com.spacetime.miniapp.dto.request.IdealUnlockConfirmReq;
import com.spacetime.miniapp.dto.request.IdealUnlockQuoteReq;
import com.spacetime.miniapp.dto.response.IdealUnlockConfirmVO;
import com.spacetime.miniapp.dto.response.IdealUnlockQuoteVO;
import com.spacetime.miniapp.dto.response.IdealUnlockedItemVO;
import com.spacetime.miniapp.dto.response.IdealPricingVO;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.service.IdealUnlockService;
import com.spacetime.miniapp.service.MiniappPublicProfileService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** PRD-08 理想型报价、折扣、扣币和资料解锁闭环。 */
@Service
@RequiredArgsConstructor
public class IdealUnlockServiceImpl implements IdealUnlockService {
    private static final Duration QUOTE_TTL = Duration.ofMinutes(5);
    private static final String QUOTE_KEY_PREFIX = "miniapp:ideal-unlock:quote:";
    private static final String UNIT_SCENE = "ideal_user_unlock";
    private static final String TARGET_BIZ_TYPE = "ideal";
    private static final String BATCH_DISCOUNT_KEY = "commercial.ideal.batch.discount.percent";
    private static final String RETENTION_DAYS_KEY = "commercial.ideal.retention.days";
    /** 仅约束单次数据库查询大小，不限制一次解锁的人数。 */
    private static final int LOOKUP_BATCH_SIZE = 500;
    private static final int DEFAULT_DISCOUNT = 10;

    private final IdealFilterSnapshotDao snapshotDao;
    private final IdealSnapshotCandidateDao candidateDao;
    private final AppUserDao appUserDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final UserUnlockRecordDao unlockRecordDao;
    private final UserAssetDao userAssetDao;
    private final UserCoinLogDao coinLogDao;
    private final CoinSceneConfigDao sceneConfigDao;
    private final AppConfigDao appConfigDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final MiniappPublicProfileService publicProfileService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public IdealUnlockQuoteVO quote(Long userId, IdealUnlockQuoteReq req) {
        if (req == null || req.getItemNos() == null || req.getItemNos().isEmpty()) {
            throw new BusinessException(400, "请选择需要解锁的用户");
        }
        return createQuote(userId, req.getSnapshotNo(), req.getItemNos(), false);
    }

    @Override
    public IdealUnlockQuoteVO quoteAll(Long userId, IdealUnlockAllQuoteReq req) {
        if (req == null || req.getItemNos() == null || req.getItemNos().isEmpty()) {
            throw new BusinessException(400, "请更新小程序后，按当前页重新解锁");
        }
        return createQuote(userId, req.getSnapshotNo(), req.getItemNos(), true);
    }

    @Override
    public IdealPricingVO getPricing() {
        CoinSceneConfig scene = enabledUnitScene();
        IdealPricingVO result = new IdealPricingVO();
        result.setUnitPrice(scene.getUnitPrice());
        result.setRetentionDays(retentionDays(scene));
        result.setBatchMax(0);
        result.setDiscountPercent(intConfig(BATCH_DISCOUNT_KEY, DEFAULT_DISCOUNT, 0, 100));
        return result;
    }

    @Override
    @Transactional
    public IdealUnlockConfirmVO confirm(Long userId, IdealUnlockConfirmReq req) {
        // 先锁资产，再建立事务内读取快照；并发请求会看到上一笔已提交的解锁及幂等回执。
        UserAsset before = userAssetDao.selectByUserIdForUpdate(userId);
        List<UserUnlockRecord> confirmed = unlocksByRequest(userId, req.getRequestId());
        if (!confirmed.isEmpty()) {
            requireSameQuote(confirmed, req.getQuoteToken());
            return confirmResult(confirmed, balance(before), true);
        }

        QuotePayload quote = readQuote(req.getQuoteToken());
        if (!Objects.equals(userId, quote.getUserId()) || quote.getExpiresAt() == null
                || !quote.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new BusinessException(409, "解锁报价已过期，请重新确认");
        }
        requireOpenUser(userId, "当前账号暂不可解锁理想型用户");
        IdealFilterSnapshot snapshot = requireSnapshot(userId, quote.getSnapshotNo());
        List<IdealSnapshotCandidate> candidates = exactCandidates(snapshot, quote.getItemNos());
        requireCandidatesAvailable(userId, candidates);
        requireQuoteConfigUnchanged(quote);
        if (!activeUnlockedTargetUserIds(userId, candidates).isEmpty()) {
            throw new BusinessException(409, "解锁状态已变化，请刷新后重新报价");
        }

        int beforeBalance = balance(before);
        if (beforeBalance < quote.getPayableCost()) {
            throw new BusinessException(5001, "千寻币余额不足");
        }
        if (userAssetDao.updateCoinBalance(userId, -quote.getPayableCost()) != 1) {
            throw new BusinessException(5001, "千寻币余额不足");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = quote.getRetentionDays() == 0
                ? null : now.plusDays(quote.getRetentionDays());
        List<Integer> allocations = allocate(quote.getPayableCost(), candidates.size());
        List<UserUnlockRecord> records = new ArrayList<>();
        int runningBalance = beforeBalance;
        for (int index = 0; index < candidates.size(); index++) {
            IdealSnapshotCandidate candidate = candidates.get(index);
            int allocated = allocations.get(index);
            UserUnlockRecord record = unlockRecord(userId, req, snapshot, candidate, allocated, now, expiresAt);
            unlockRecordDao.insert(record);
            writeCoinLog(record, candidate.getItemNo(), runningBalance, runningBalance - allocated);
            runningBalance -= allocated;
            records.add(record);
        }
        userAssetDao.updateLastConsumeTime(userId, now);
        UserAsset reloaded = userAssetDao.selectByUserId(userId);
        return confirmResult(records, reloaded == null ? runningBalance : balance(reloaded), false);
    }

    private IdealUnlockQuoteVO createQuote(Long userId, String snapshotNo,
                                           List<String> selectedItemNos, boolean unlockAll) {
        requireOpenUser(userId, "当前账号暂不可解锁理想型用户");
        IdealFilterSnapshot snapshot = requireSnapshot(userId, snapshotNo);
        List<IdealSnapshotCandidate> candidates = exactCandidates(snapshot, normalizeItemNos(selectedItemNos));
        Set<Long> activeTargetUserIds = activeUnlockedTargetUserIds(userId, candidates);
        candidates = candidates.stream()
                .filter(item -> !activeTargetUserIds.contains(item.getCandidateUserId()))
                .toList();
        if (unlockAll) {
            // 全部仅指当前页传入的人员；拉黑/注销不能阻断本页其他有效人员。
            Set<Long> availableIds = availableCandidateIds(userId, candidates);
            candidates = candidates.stream().filter(item -> availableIds.contains(item.getCandidateUserId())).toList();
        } else {
            requireCandidatesAvailable(userId, candidates);
        }
        if (candidates.isEmpty()) {
            throw new BusinessException(409, "当前没有需要解锁的理想型用户");
        }
        // 优惠按实际解锁人数判断，手动勾选多人和本页批量使用同一口径。
        int discount = unlockAll || candidates.size() > 1
                ? intConfig(BATCH_DISCOUNT_KEY, DEFAULT_DISCOUNT, 0, 100) : 0;
        CoinSceneConfig scene = enabledUnitScene();
        int retentionDays = retentionDays(scene);
        int original = Math.multiplyExact(scene.getUnitPrice(), candidates.size());
        int payable = ceilPercent(original, 100 - discount);
        int currentBalance = balance(userAssetDao.selectByUserId(userId));
        LocalDateTime expiresAt = LocalDateTime.now().plus(QUOTE_TTL);
        String token = "iuq_" + IdUtil.fastSimpleUUID();
        QuotePayload payload = new QuotePayload(userId, snapshotNo,
                candidates.stream().map(IdealSnapshotCandidate::getItemNo).toList(),
                scene.getUnitPrice(), retentionDays, 0, discount,
                original, payable, unlockAll, expiresAt);
        try {
            redisTemplate.opsForValue().set(quoteKey(token), objectMapper.writeValueAsString(payload), QUOTE_TTL);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(5001, "生成理想型解锁报价失败，请稍后重试");
        }
        return quoteResult(token, payload, currentBalance);
    }

    private IdealFilterSnapshot requireSnapshot(Long userId, String snapshotNo) {
        IdealFilterSnapshot snapshot = snapshotNo == null ? null : snapshotDao.selectBySnapshotNo(snapshotNo);
        if (snapshot == null || !Objects.equals(userId, snapshot.getUserId())) {
            throw new BusinessException(404, "理想型筛选记录不存在");
        }
        if (!"active".equals(snapshot.getStatus()) || snapshot.getExpiresAt() == null
                || !snapshot.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new BusinessException(409, "理想型筛选记录已过期");
        }
        return snapshot;
    }

    private List<IdealSnapshotCandidate> exactCandidates(IdealFilterSnapshot snapshot, List<String> itemNos) {
        List<String> normalized = normalizeItemNos(itemNos);
        if (normalized.isEmpty()) {
            throw new BusinessException(400, "请选择需要解锁的用户");
        }
        List<IdealSnapshotCandidate> found = new ArrayList<>();
        for (int start = 0; start < normalized.size(); start += LOOKUP_BATCH_SIZE) {
            found.addAll(safeCandidates(candidateDao.selectByItemNos(snapshot.getId(),
                    normalized.subList(start, Math.min(start + LOOKUP_BATCH_SIZE, normalized.size())))));
        }
        Map<String, IdealSnapshotCandidate> byNo = found.stream()
                .collect(Collectors.toMap(IdealSnapshotCandidate::getItemNo, Function.identity(), (a, b) -> a));
        if (byNo.size() != normalized.size()) {
            throw new BusinessException(409, "理想型结果已变化，请刷新后重试");
        }
        return normalized.stream().map(byNo::get).toList();
    }

    private void requireCandidatesAvailable(Long userId, List<IdealSnapshotCandidate> candidates) {
        Set<Long> availableIds = availableCandidateIds(userId, candidates);
        if (candidates.stream().anyMatch(item -> !availableIds.contains(item.getCandidateUserId()))) {
            throw new BusinessException(409, "理想型用户状态已变化，请刷新后重试");
        }
    }

    /** 批量核对准入及双向拉黑，避免解锁全部逐人往返查询。 */
    private Set<Long> availableCandidateIds(Long userId, List<IdealSnapshotCandidate> candidates) {
        List<Long> targetIds = candidates.stream().map(IdealSnapshotCandidate::getCandidateUserId)
                .filter(Objects::nonNull).distinct().toList();
        Set<Long> result = new LinkedHashSet<>();
        for (int start = 0; start < targetIds.size(); start += LOOKUP_BATCH_SIZE) {
            List<Long> batch = targetIds.subList(start, Math.min(start + LOOKUP_BATCH_SIZE, targetIds.size()));
            List<AppUser> users = appUserDao.selectByIds(batch);
            Map<Long, String> access = accessProjectionService.projectAll(users == null ? List.of() : users);
            Set<Long> blockedIds = new LinkedHashSet<>();
            var blocks = relationBlockDao.selectActiveBetweenUserAndTargets(userId, batch,
                    List.of(RelationBlockTypeEnum.BLACKLIST.getCode(), RelationBlockTypeEnum.NO_RECOMMEND.getCode()));
            if (blocks != null) {
                blocks.forEach(block -> {
                    boolean outgoing = userId.equals(block.getUserId());
                    if (outgoing || RelationBlockTypeEnum.BLACKLIST.getCode().equals(block.getBlockType())) {
                        blockedIds.add(outgoing ? block.getTargetUserId() : block.getUserId());
                    }
                });
            }
            for (Long targetId : batch) {
                if (!userId.equals(targetId) && "OPEN".equals(access.get(targetId)) && !blockedIds.contains(targetId)) {
                    result.add(targetId);
                }
            }
        }
        return result;
    }

    private AppUser requireOpenUser(Long userId, String message) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(403, message);
        }
        return user;
    }

    private Set<Long> activeUnlockedTargetUserIds(Long userId,
                                                   List<IdealSnapshotCandidate> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return Set.of();
        }
        List<Long> targetIds = candidates.stream()
                .map(IdealSnapshotCandidate::getCandidateUserId)
                .filter(Objects::nonNull).distinct().toList();
        Set<Long> unlocked = new LinkedHashSet<>();
        LocalDateTime now = LocalDateTime.now();
        for (int start = 0; start < targetIds.size(); start += LOOKUP_BATCH_SIZE) {
            List<Long> batch = targetIds.subList(start, Math.min(start + LOOKUP_BATCH_SIZE, targetIds.size()));
            List<UserUnlockRecord> records = unlockRecordDao.selectList(new LambdaQueryWrapper<UserUnlockRecord>()
                    .eq(UserUnlockRecord::getUserId, userId)
                    .eq(UserUnlockRecord::getTargetBizType, TARGET_BIZ_TYPE)
                    .in(UserUnlockRecord::getTargetUserId, batch)
                    .eq(UserUnlockRecord::getStatus, UnlockRecordStatusEnum.ACTIVE.getCode())
                    .eq(UserUnlockRecord::getActiveMarker, 1)
                    .and(expiry -> expiry.isNull(UserUnlockRecord::getExpireTime).or().gt(UserUnlockRecord::getExpireTime, now)));
            safeUnlocks(records).stream().map(UserUnlockRecord::getTargetUserId).filter(Objects::nonNull).forEach(unlocked::add);
        }
        return unlocked;
    }

    private List<UserUnlockRecord> unlocksByRequest(Long userId, String requestId) {
        if (requestId == null || requestId.isBlank()) {
            throw new BusinessException(400, "解锁请求幂等键不能为空");
        }
        return safeUnlocks(unlockRecordDao.selectList(new LambdaQueryWrapper<UserUnlockRecord>()
                .eq(UserUnlockRecord::getUserId, userId)
                .eq(UserUnlockRecord::getRequestId, requestId)
                .orderByAsc(UserUnlockRecord::getId)));
    }

    private void requireSameQuote(List<UserUnlockRecord> records, String quoteToken) {
        if (quoteToken == null || records.stream()
                .anyMatch(item -> !Objects.equals(quoteToken, item.getQuoteToken()))) {
            throw new BusinessException(409, "解锁请求幂等键已被其他报价占用");
        }
    }

    private QuotePayload readQuote(String quoteToken) {
        String json = quoteToken == null ? null : redisTemplate.opsForValue().get(quoteKey(quoteToken));
        if (json == null || json.isBlank()) {
            throw new BusinessException(409, "解锁报价已过期，请重新确认");
        }
        try {
            return objectMapper.readValue(json, QuotePayload.class);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(409, "解锁报价无效，请重新确认");
        }
    }

    private void requireQuoteConfigUnchanged(QuotePayload quote) {
        CoinSceneConfig scene = enabledUnitScene();
        int discount = quote.isUnlockAll() || quote.getItemNos().size() > 1
                ? intConfig(BATCH_DISCOUNT_KEY, DEFAULT_DISCOUNT, 0, 100) : 0;
        int retentionDays = retentionDays(scene);
        int expectedOriginal = Math.multiplyExact(scene.getUnitPrice(), quote.getItemNos().size());
        int expectedPayable = ceilPercent(expectedOriginal, 100 - discount);
        if (!Objects.equals(scene.getUnitPrice(), quote.getUnitPrice())
                || !Objects.equals(retentionDays, quote.getRetentionDays())
                || discount != quote.getDiscountPercent()
                || expectedOriginal != quote.getOriginalCost() || expectedPayable != quote.getPayableCost()) {
            throw new BusinessException(409, "理想型解锁配置已变化，请重新报价");
        }
    }

    private CoinSceneConfig enabledUnitScene() {
        Page<CoinSceneConfig> page = sceneConfigDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<CoinSceneConfig>()
                        .eq(CoinSceneConfig::getSceneCode, UNIT_SCENE)
                        .eq(CoinSceneConfig::getStatus, CommonStatusEnum.ENABLED.getCode()));
        CoinSceneConfig scene = page == null || page.getRecords() == null || page.getRecords().isEmpty()
                ? null : page.getRecords().get(0);
        if (scene == null || scene.getUnitPrice() == null || scene.getUnitPrice() <= 0
                || scene.getRetentionDays() == null || scene.getRetentionDays() < 0) {
            throw new BusinessException(5001, "理想型解锁价格暂未配置");
        }
        return scene;
    }

    private int retentionDays(CoinSceneConfig scene) {
        int fallback = scene.getRetentionDays() == null || scene.getRetentionDays() <= 0
                ? 90 : scene.getRetentionDays();
        return intConfig(RETENTION_DAYS_KEY, fallback, 1, 3650);
    }

    private int intConfig(String key, int defaultValue, int min, int max) {
        AppConfig config = appConfigDao.selectByKey(key);
        if (config == null || !CommonStatusEnum.ENABLED.getCode().equals(config.getStatus())
                || config.getConfigValue() == null || config.getConfigValue().isBlank()) {
            return defaultValue;
        }
        try {
            int value = Integer.parseInt(config.getConfigValue());
            if (value < min || value > max) {
                throw new NumberFormatException();
            }
            return value;
        } catch (NumberFormatException ex) {
            throw new BusinessException(5001, "商业化配置无效：" + key);
        }
    }

    private UserUnlockRecord unlockRecord(Long userId, IdealUnlockConfirmReq req,
                                          IdealFilterSnapshot snapshot,
                                          IdealSnapshotCandidate candidate,
                                          int allocatedCost,
                                          LocalDateTime now,
                                          LocalDateTime expiresAt) {
        UserUnlockRecord record = new UserUnlockRecord();
        record.setUnlockNo("ULK-" + IdUtil.getSnowflakeNextIdStr());
        record.setRequestId(req.getRequestId());
        record.setQuoteToken(req.getQuoteToken());
        record.setUserId(userId);
        record.setTargetUserId(candidate.getCandidateUserId());
        record.setTargetBizType(TARGET_BIZ_TYPE);
        record.setTargetBizNo(String.valueOf(candidate.getCandidateUserId()));
        record.setSnapshotNo(snapshot.getSnapshotNo());
        record.setSnapshotItemNo(candidate.getItemNo());
        record.setActiveMarker(1);
        record.setUnlockScene(UNIT_SCENE);
        record.setUnlockMethod("coin");
        record.setCoinCost(allocatedCost);
        record.setEffectiveTime(now);
        record.setExpireTime(expiresAt);
        record.setStatus(UnlockRecordStatusEnum.ACTIVE.getCode());
        return record;
    }

    private void writeCoinLog(UserUnlockRecord record, String itemNo,
                              int beforeBalance, int afterBalance) {
        UserCoinLog log = new UserCoinLog();
        log.setFlowNo("CF" + IdUtil.getSnowflakeNextIdStr());
        log.setUserId(record.getUserId());
        log.setFlowType(FlowTypeEnum.CONSUME.getCode());
        log.setChangeAmount(-record.getCoinCost());
        log.setBalanceBefore(beforeBalance);
        log.setBalanceAfter(afterBalance);
        log.setBizScene(BizSceneEnum.IDEAL_UNLOCK.getCode());
        log.setBizDesc("解锁理想型用户 " + itemNo);
        log.setRefId(record.getId());
        log.setRefType("unlock_record");
        log.setBizIdempotencyKey("ideal:" + record.getRequestId() + ":" + itemNo);
        coinLogDao.insert(log);
    }

    private IdealUnlockConfirmVO confirmResult(List<UserUnlockRecord> records,
                                               int currentBalance,
                                               boolean replayed) {
        List<UserUnlockRecord> ordered = new ArrayList<>(records);
        ordered.sort(Comparator.comparing(UserUnlockRecord::getId,
                Comparator.nullsLast(Comparator.naturalOrder())));
        List<IdealUnlockedItemVO> items = ordered.stream().map(record -> {
            // 批量确认仅返回权益回执，公开资料由当前结果页或历史解锁页按页加载，避免大批量确认超时。
            PublicProfileVO profile = ordered.size() == 1 ? publicProfileService.getPublicProfile(
                    record.getUserId(), record.getTargetUserId()) : null;
            IdealUnlockedItemVO item = new IdealUnlockedItemVO();
            item.setItemNo(record.getSnapshotItemNo());
            item.setCandidateNo(String.valueOf(record.getTargetUserId()));
            item.setProfile(profile);
            item.setCommunicationMode("PRIVATE_MESSAGE");
            item.setUnlockExpiresAt(record.getExpireTime());
            return item;
        }).toList();
        IdealUnlockConfirmVO result = new IdealUnlockConfirmVO();
        result.setSnapshotNo(ordered.isEmpty() ? null : ordered.get(0).getSnapshotNo());
        result.setPaidCost(ordered.stream().map(UserUnlockRecord::getCoinCost)
                .filter(Objects::nonNull).mapToInt(Integer::intValue).sum());
        result.setNewBalance(currentBalance);
        result.setAlreadyConfirmed(replayed);
        result.setUnlockedItems(items);
        return result;
    }

    private IdealUnlockQuoteVO quoteResult(String token, QuotePayload payload, int balance) {
        IdealUnlockQuoteVO result = new IdealUnlockQuoteVO();
        result.setQuoteToken(token);
        result.setQuoteExpiresAt(payload.getExpiresAt());
        result.setSnapshotNo(payload.getSnapshotNo());
        result.setCandidateCount(payload.getItemNos().size());
        result.setUnitPrice(payload.getUnitPrice());
        result.setOriginalCost(payload.getOriginalCost());
        result.setDiscountPercent(payload.getDiscountPercent());
        result.setDiscountAmount(payload.getOriginalCost() - payload.getPayableCost());
        result.setPayableCost(payload.getPayableCost());
        result.setCurrentBalance(balance);
        result.setBalanceEnough(balance >= payload.getPayableCost());
        result.setRetentionDays(payload.getRetentionDays());
        result.setBatchMax(0);
        result.setUnlockAll(payload.isUnlockAll());
        return result;
    }

    private List<Integer> allocate(int total, int count) {
        int base = total / count;
        int remainder = total % count;
        List<Integer> result = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            result.add(base + (index < remainder ? 1 : 0));
        }
        return result;
    }

    private int ceilPercent(int original, int percent) {
        return Math.toIntExact(((long) original * percent + 99) / 100);
    }

    private int balance(UserAsset asset) {
        return asset == null || asset.getCoinBalance() == null ? 0 : asset.getCoinBalance();
    }

    private List<String> normalizeItemNos(List<String> itemNos) {
        if (itemNos == null) {
            return List.of();
        }
        return itemNos.stream().filter(Objects::nonNull).map(String::trim)
                .filter(item -> !item.isEmpty()).collect(Collectors.toCollection(LinkedHashSet::new))
                .stream().toList();
    }

    private List<IdealSnapshotCandidate> safeCandidates(List<IdealSnapshotCandidate> candidates) {
        return candidates == null ? List.of() : candidates;
    }

    private List<UserUnlockRecord> safeUnlocks(List<UserUnlockRecord> records) {
        return records == null ? List.of() : records;
    }

    private String quoteKey(String token) {
        return QUOTE_KEY_PREFIX + token;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuotePayload {
        private Long userId;
        private String snapshotNo;
        private List<String> itemNos;
        private Integer unitPrice;
        private Integer retentionDays;
        private Integer batchMax;
        private Integer discountPercent;
        private Integer originalCost;
        private Integer payableCost;
        private boolean unlockAll;
        private LocalDateTime expiresAt;
    }
}

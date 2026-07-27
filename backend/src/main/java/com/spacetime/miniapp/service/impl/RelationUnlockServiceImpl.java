package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.enums.RelationVisitStatusEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.RelationUnlockConfirmReq;
import com.spacetime.miniapp.dto.request.RelationUnlockQuoteReq;
import com.spacetime.miniapp.dto.response.UnlockConfirmVO;
import com.spacetime.miniapp.dto.response.UnlockQuoteVO;
import com.spacetime.miniapp.service.RelationUnlockService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/** 喜欢/访客具体关系记录的两步报价与确认扣币实现。 */
@Service
@RequiredArgsConstructor
public class RelationUnlockServiceImpl implements RelationUnlockService {
    private static final int CURRENT_ACCESS_CLOSED = 20001;
    private static final int TARGET_UNAVAILABLE = 20002;
    private static final int PARAM_ERROR = 4001;
    private static final int ASSET_ERROR = 5001;
    private static final Duration QUOTE_TTL = Duration.ofMinutes(5);
    private static final String QUOTE_KEY_PREFIX = "miniapp:relation-unlock:quote:";
    private static final String LIKE_TYPE = "like";
    private static final String VISIT_TYPE = "visit";
    private static final String LIKE_SCENE = "likes_unlock_one";
    private static final String VISIT_SCENE = "viewers_unlock_one";

    private final AppUserDao appUserDao;
    private final AppRelationLikeDao likeDao;
    private final AppRelationVisitDao visitDao;
    private final UserAssetDao userAssetDao;
    private final CoinSceneConfigDao sceneConfigDao;
    private final UserUnlockRecordDao unlockRecordDao;
    private final UserCoinLogDao coinLogDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public UnlockQuoteVO quote(Long userId, RelationUnlockQuoteReq req) {
        requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        validateSceneAndType(req.getScene(), req.getTargetBizType());
        RelationTarget target = requireRelationTarget(userId, req.getTargetBizType(), req.getTargetBizNo());
        requireOpenUser(target.targetUserId(), TARGET_UNAVAILABLE, "关系对象当前不可解锁");
        UserAsset asset = userAssetDao.selectByUserId(userId);
        UserUnlockRecord existing = activeUnlock(
                userId, req.getTargetBizType(), req.getTargetBizNo(), target.targetUserId());
        if (existing != null) {
            CoinSceneConfig config = getEnabledScene(req.getScene());
            return quoteResult(null, req, target.targetUserId(), config.getUnitPrice(), balance(asset), true, null);
        }
        requireSingleUnlockNeeded(asset);
        CoinSceneConfig config = getEnabledScene(req.getScene());

        LocalDateTime expireAt = LocalDateTime.now().plus(QUOTE_TTL);
        String quoteToken = "uq_" + IdUtil.fastSimpleUUID();
        UnlockQuotePayload payload = new UnlockQuotePayload(userId, req.getScene(), req.getTargetBizType(),
                req.getTargetBizNo(), target.targetUserId(), config.getUnitPrice(), expireAt);
        try {
            redisTemplate.opsForValue().set(quoteKey(quoteToken), objectMapper.writeValueAsString(payload), QUOTE_TTL);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(ASSET_ERROR, "生成解锁报价失败，请稍后重试");
        }
        return quoteResult(quoteToken, req, null, config.getUnitPrice(), balance(asset), false, expireAt);
    }

    @Override
    @Transactional
    public UnlockConfirmVO confirm(Long userId, RelationUnlockConfirmReq req) {
        UserUnlockRecord idempotent = unlockByRequest(userId, req.getRequestId());
        if (idempotent != null) {
            if (idempotent.getQuoteToken() != null
                    && !Objects.equals(idempotent.getQuoteToken(), req.getQuoteToken())) {
                throw new BusinessException(PARAM_ERROR, "解锁请求幂等键已被其他报价占用");
            }
            if (idempotent.getQuoteToken() == null) {
                requireSameUnlockTarget(idempotent, readQuote(req.getQuoteToken()));
            }
            return confirmResult(idempotent, balance(userAssetDao.selectByUserId(userId)), false);
        }
        UnlockQuotePayload quote = readQuote(req.getQuoteToken());
        if (!Objects.equals(quote.getUserId(), userId) || quote.getExpireAt() == null
                || !quote.getExpireAt().isAfter(LocalDateTime.now())) {
            throw new BusinessException(ASSET_ERROR, "解锁报价已过期，请重新确认");
        }
        requireOpenUser(userId, CURRENT_ACCESS_CLOSED, "关系反馈准入未开放");
        RelationTarget currentTarget = requireRelationTarget(userId, quote.getTargetBizType(), quote.getTargetBizNo());
        if (!Objects.equals(currentTarget.targetUserId(), quote.getTargetUserId())) {
            throw new BusinessException(TARGET_UNAVAILABLE, "关系对象已变化，请刷新后重试");
        }
        requireOpenUser(currentTarget.targetUserId(), TARGET_UNAVAILABLE, "关系对象当前不可解锁");
        validateSceneAndType(quote.getScene(), quote.getTargetBizType());
        UserAsset before = userAssetDao.selectByUserIdForUpdate(userId);
        UserUnlockRecord existing = activeUnlock(
                userId, quote.getTargetBizType(), quote.getTargetBizNo(), currentTarget.targetUserId());
        if (existing != null) {
            return confirmResult(existing, balance(before), false);
        }
        requireSingleUnlockNeeded(before);
        CoinSceneConfig config = getEnabledScene(quote.getScene());
        if (!Objects.equals(config.getUnitPrice(), quote.getUnitPrice())) {
            throw new BusinessException(ASSET_ERROR, "解锁价格已变化，请重新确认");
        }

        int price = quote.getUnitPrice() == null ? 0 : quote.getUnitPrice();
        if (price <= 0) {
            throw new BusinessException(ASSET_ERROR, "当前解锁场景暂不可用");
        }
        if (before == null || balance(before) < price) {
            throw new BusinessException(ASSET_ERROR, "千寻币余额不足");
        }
        if (userAssetDao.updateCoinBalance(userId, -price) != 1) {
            throw new BusinessException(ASSET_ERROR, "千寻币余额不足");
        }

        LocalDateTime now = LocalDateTime.now();
        UserUnlockRecord record = new UserUnlockRecord();
        record.setUnlockNo("ULK-" + IdUtil.getSnowflakeNextIdStr());
        record.setRequestId(req.getRequestId());
        record.setQuoteToken(req.getQuoteToken());
        record.setUserId(userId);
        record.setTargetUserId(quote.getTargetUserId());
        record.setTargetBizType(quote.getTargetBizType());
        record.setTargetBizNo(quote.getTargetBizNo());
        record.setActiveMarker(1);
        record.setUnlockScene(quote.getScene());
        record.setUnlockMethod("coin");
        record.setCoinCost(price);
        record.setEffectiveTime(now);
        record.setExpireTime(null);
        record.setStatus(UnlockRecordStatusEnum.ACTIVE.getCode());
        unlockRecordDao.insert(record);

        UserAsset after = userAssetDao.selectByUserId(userId);
        int afterBalance = after == null ? balance(before) - price : balance(after);
        userAssetDao.updateLastConsumeTime(userId, now);
        writeCoinLog(record, balance(before), afterBalance);
        return confirmResult(record, afterBalance, true);
    }

    private void requireSameUnlockTarget(UserUnlockRecord record, UnlockQuotePayload quote) {
        if (!Objects.equals(record.getTargetUserId(), quote.getTargetUserId())
                || !Objects.equals(record.getTargetBizType(), quote.getTargetBizType())
                || !Objects.equals(record.getTargetBizNo(), quote.getTargetBizNo())
                || !Objects.equals(record.getUnlockScene(), quote.getScene())) {
            throw new BusinessException(PARAM_ERROR, "解锁请求幂等键已被其他报价占用");
        }
    }

    private UnlockQuotePayload readQuote(String quoteToken) {
        String json = redisTemplate.opsForValue().get(quoteKey(quoteToken));
        if (json == null || json.isBlank()) {
            throw new BusinessException(ASSET_ERROR, "解锁报价已过期，请重新确认");
        }
        try {
            return objectMapper.readValue(json, UnlockQuotePayload.class);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(ASSET_ERROR, "解锁报价无效，请重新确认");
        }
    }

    private RelationTarget requireRelationTarget(Long userId, String targetBizType, String targetBizNo) {
        if (LIKE_TYPE.equals(targetBizType)) {
            AppRelationLike like = likeDao.selectOne(new LambdaQueryWrapper<AppRelationLike>()
                    .eq(AppRelationLike::getLikeNo, targetBizNo)
                    .eq(AppRelationLike::getToUserId, userId)
                    .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                    .eq(AppRelationLike::getActiveMarker, 1));
            if (like == null) {
                throw new BusinessException(TARGET_UNAVAILABLE, "喜欢记录不存在或已失效");
            }
            return new RelationTarget(like.getFromUserId());
        }
        if (VISIT_TYPE.equals(targetBizType)) {
            AppRelationVisit visit = visitDao.selectOne(new LambdaQueryWrapper<AppRelationVisit>()
                    .eq(AppRelationVisit::getVisitNo, targetBizNo)
                    .eq(AppRelationVisit::getTargetUserId, userId)
                    .eq(AppRelationVisit::getVisitStatus, RelationVisitStatusEnum.VISIBLE.getCode())
                    .ge(AppRelationVisit::getLastVisitTime, LocalDateTime.now().minusDays(7)));
            if (visit == null) {
                throw new BusinessException(TARGET_UNAVAILABLE, "访客记录不存在或已超展示窗口");
            }
            return new RelationTarget(visit.getVisitorUserId());
        }
        throw new BusinessException(PARAM_ERROR, "不支持的解锁业务类型");
    }

    private AppUser requireOpenUser(Long userId, int errorCode, String message) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(errorCode, message);
        }
        return user;
    }

    private CoinSceneConfig getEnabledScene(String scene) {
        Page<CoinSceneConfig> result = sceneConfigDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<CoinSceneConfig>()
                        .eq(CoinSceneConfig::getSceneCode, scene)
                        .eq(CoinSceneConfig::getStatus, CommonStatusEnum.ENABLED.getCode()));
        CoinSceneConfig config = result == null || result.getRecords() == null || result.getRecords().isEmpty()
                ? null : result.getRecords().get(0);
        if (config == null || config.getUnitPrice() == null || config.getUnitPrice() <= 0) {
            throw new BusinessException(ASSET_ERROR, "当前解锁场景暂不可用");
        }
        return config;
    }

    private UserUnlockRecord activeUnlock(
            Long userId, String targetBizType, String targetBizNo, Long targetUserId) {
        if (VISIT_TYPE.equals(targetBizType)) {
            return unlockRecordDao.selectActiveByTargetUser(userId, targetBizType, targetUserId);
        }
        return first(unlockRecordDao.selectList(new LambdaQueryWrapper<UserUnlockRecord>()
                .eq(UserUnlockRecord::getUserId, userId)
                .eq(UserUnlockRecord::getTargetBizType, targetBizType)
                .eq(UserUnlockRecord::getTargetBizNo, targetBizNo)
                .eq(UserUnlockRecord::getStatus, UnlockRecordStatusEnum.ACTIVE.getCode())
                .eq(UserUnlockRecord::getActiveMarker, 1)
                .last("LIMIT 1")));
    }

    private UserUnlockRecord unlockByRequest(Long userId, String requestId) {
        return first(unlockRecordDao.selectList(new LambdaQueryWrapper<UserUnlockRecord>()
                .eq(UserUnlockRecord::getUserId, userId)
                .eq(UserUnlockRecord::getRequestId, requestId)
                .eq(UserUnlockRecord::getStatus, UnlockRecordStatusEnum.ACTIVE.getCode())
                .last("LIMIT 1")));
    }

    private UserUnlockRecord first(List<UserUnlockRecord> records) {
        List<UserUnlockRecord> values = records == null ? Collections.emptyList() : records;
        return values.isEmpty() ? null : values.get(0);
    }

    private void validateSceneAndType(String scene, String targetBizType) {
        boolean valid = LIKE_SCENE.equals(scene) && LIKE_TYPE.equals(targetBizType)
                || VISIT_SCENE.equals(scene) && VISIT_TYPE.equals(targetBizType);
        if (!valid) {
            throw new BusinessException(PARAM_ERROR, "解锁场景与业务类型不匹配");
        }
    }

    private void writeCoinLog(UserUnlockRecord record, int beforeBalance, int afterBalance) {
        UserCoinLog log = new UserCoinLog();
        log.setFlowNo("CF" + IdUtil.getSnowflakeNextIdStr());
        log.setUserId(record.getUserId());
        log.setFlowType(FlowTypeEnum.CONSUME.getCode());
        log.setChangeAmount(-record.getCoinCost());
        log.setBalanceBefore(beforeBalance);
        log.setBalanceAfter(afterBalance);
        log.setBizScene(LIKE_TYPE.equals(record.getTargetBizType())
                ? BizSceneEnum.LIKES_UNLOCK.getCode() : BizSceneEnum.VIEWERS_UNLOCK.getCode());
        log.setBizDesc((LIKE_TYPE.equals(record.getTargetBizType()) ? "解锁喜欢记录 " : "解锁访客记录 ")
                + record.getTargetBizNo());
        log.setRefId(record.getId());
        log.setRefType("unlock_record");
        coinLogDao.insert(log);
    }

    private UnlockQuoteVO quoteResult(String quoteToken, RelationUnlockQuoteReq req, Long targetUserId,
                                      Integer unitPrice, int balance, boolean existing, LocalDateTime expireAt) {
        UnlockQuoteVO result = new UnlockQuoteVO();
        result.setQuoteToken(quoteToken);
        result.setScene(req.getScene());
        result.setTargetBizType(req.getTargetBizType());
        result.setTargetBizNo(req.getTargetBizNo());
        result.setTargetUserId(targetUserId);
        result.setUnitPrice(unitPrice);
        result.setCoinBalance(balance);
        result.setAlreadyUnlocked(existing);
        result.setExpireAt(expireAt);
        return result;
    }

    private UnlockConfirmVO confirmResult(UserUnlockRecord record, int balance, boolean charged) {
        UnlockConfirmVO result = new UnlockConfirmVO();
        result.setUnlockNo(record.getUnlockNo());
        result.setTargetBizType(record.getTargetBizType());
        result.setTargetBizNo(record.getTargetBizNo());
        result.setTargetUserId(record.getTargetUserId());
        result.setStatus(record.getStatus());
        result.setCoinCost(charged ? record.getCoinCost() : 0);
        result.setCoinBalance(balance);
        result.setDisplayStatus("clear");
        result.setCharged(charged);
        result.setEffectiveTime(record.getEffectiveTime());
        result.setExpireTime(record.getExpireTime());
        return result;
    }

    private int balance(UserAsset asset) {
        return asset == null || asset.getCoinBalance() == null ? 0 : asset.getCoinBalance();
    }

    private void requireSingleUnlockNeeded(UserAsset asset) {
        LocalDateTime now = LocalDateTime.now();
        if (asset != null && VipStatusEnum.ACTIVE.getCode().equals(asset.getVipStatus())
                && (asset.getVipExpireTime() == null || asset.getVipExpireTime().isAfter(now))) {
            throw new BusinessException(ASSET_ERROR, "会员权益已覆盖该列表，无需单条解锁");
        }
    }

    private String quoteKey(String quoteToken) {
        if (quoteToken == null || quoteToken.isBlank()) {
            throw new BusinessException(PARAM_ERROR, "报价令牌不能为空");
        }
        return QUOTE_KEY_PREFIX + quoteToken;
    }

    private record RelationTarget(Long targetUserId) {
    }

    /** Redis 中的服务端可信报价快照。 */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnlockQuotePayload {
        private Long userId;
        private String scene;
        private String targetBizType;
        private String targetBizNo;
        private Long targetUserId;
        private Integer unitPrice;
        private LocalDateTime expireAt;
    }
}

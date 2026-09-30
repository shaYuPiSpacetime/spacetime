package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.RecommendViewLogDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.RecommendViewLog;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.RecommendReplayUnlockReq;
import com.spacetime.miniapp.dto.response.RecommendReplayPageVO;
import com.spacetime.miniapp.dto.response.RecommendReplayQuoteVO;
import com.spacetime.miniapp.dto.response.RecommendReplayUnlockVO;
import com.spacetime.miniapp.dto.response.VipBenefitVO;
import com.spacetime.miniapp.service.RecommendReplayAccessService;
import com.spacetime.miniapp.service.RecommendService;
import com.spacetime.miniapp.service.VipService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

/** 对回放中的具体用户报价并在事务内完成单次扣币。 */
@Service
@RequiredArgsConstructor
public class RecommendReplayAccessServiceImpl implements RecommendReplayAccessService {
    private static final String SCENE = "replay_profile_unlock_one";
    private static final String TARGET_TYPE = "replay";
    private static final String IDEAL_TARGET_TYPE = "ideal";
    private static final String REPLAY_BENEFIT = "three_day_replay";
    private static final String ISSUED_ACTION = "issued";
    private static final ZoneId BEIJING = ZoneId.of("Asia/Shanghai");

    private final RecommendService recommendService;
    private final CoinSceneConfigDao sceneConfigDao;
    private final UserAssetDao assetDao;
    private final UserUnlockRecordDao unlockRecordDao;
    private final UserCoinLogDao coinLogDao;
    private final RecommendViewLogDao viewLogDao;
    private final VipService vipService;

    @Override
    public boolean isTodayIssuedCandidate(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            return false;
        }
        LocalDate today = LocalDate.now(BEIJING);
        LocalDateTime todayStart = today.atStartOfDay();
        List<RecommendViewLog> issued = viewLogDao.selectList(new LambdaQueryWrapper<RecommendViewLog>()
                .eq(RecommendViewLog::getUserId, userId)
                .eq(RecommendViewLog::getCandidateUserId, targetUserId)
                .eq(RecommendViewLog::getAction, ISSUED_ACTION)
                .ge(RecommendViewLog::getViewedAt, todayStart)
                .lt(RecommendViewLog::getViewedAt, todayStart.plusDays(1))
                .last("LIMIT 1"));
        return issued != null && issued.stream().anyMatch(log ->
                Objects.equals(log.getUserId(), userId)
                        && Objects.equals(log.getCandidateUserId(), targetUserId)
                        && ISSUED_ACTION.equals(log.getAction())
                        && log.getViewedAt() != null
                        && log.getViewedAt().toLocalDate().equals(today));
    }

    @Override
    public boolean canOpenRecommendedProfile(Long userId, Long targetUserId) {
        UserAsset asset = assetDao.selectByUserId(userId);
        if (asset != null && VipStatusEnum.ACTIVE.getCode().equals(asset.getVipStatus())
                && (asset.getVipExpireTime() == null || asset.getVipExpireTime().isAfter(LocalDateTime.now()))) {
            List<VipBenefitVO> benefits = vipService.getBenefits();
            if (benefits != null && benefits.stream()
                    .anyMatch(item -> REPLAY_BENEFIT.equals(item.getBenefitCode()))) {
                return true;
            }
        }
        return hasPaidTargetUnlock(userId, targetUserId);
    }

    @Override
    public RecommendReplayQuoteVO quote(Long userId, Long targetUserId) {
        boolean issuedToday = isTodayIssuedCandidate(userId, targetUserId);
        RecommendReplayPageVO replay = requireReplayTarget(userId, targetUserId, issuedToday);
        UserAsset asset = assetDao.selectByUserId(userId);
        boolean member = Boolean.TRUE.equals(replay.getMemberProfileAccess());
        boolean unlocked = issuedToday || member || hasPaidTargetUnlock(userId, targetUserId);
        RecommendReplayQuoteVO result = new RecommendReplayQuoteVO();
        result.setCanOpen(unlocked);
        result.setMemberAccess(member);
        result.setUnitPrice(unlocked ? 0 : enabledScene().getUnitPrice());
        result.setCoinBalance(balance(asset));
        return result;
    }

    @Override
    @Transactional
    public RecommendReplayUnlockVO unlock(Long userId, Long targetUserId, RecommendReplayUnlockReq req) {
        if (req == null || req.getRequestId() == null || req.getRequestId().isBlank()
                || req.getExpectedPrice() == null || req.getExpectedPrice() < 0) {
            throw new BusinessException(400, "解锁参数有误");
        }
        boolean issuedToday = isTodayIssuedCandidate(userId, targetUserId);
        RecommendReplayPageVO replay = requireReplayTarget(userId, targetUserId, issuedToday);
        if (issuedToday || Boolean.TRUE.equals(replay.getMemberProfileAccess())) {
            return unlockedResult(0, balance(assetDao.selectByUserId(userId)));
        }

        UserAsset asset = assetDao.selectByUserIdForUpdate(userId);
        if (hasPaidTargetUnlock(userId, targetUserId)) {
            return unlockedResult(0, balance(asset));
        }
        List<UserUnlockRecord> sameRequest = unlockRecordDao.selectList(
                new LambdaQueryWrapper<UserUnlockRecord>()
                        .eq(UserUnlockRecord::getUserId, userId)
                        .eq(UserUnlockRecord::getRequestId, req.getRequestId())
                        .last("LIMIT 1"));
        if (sameRequest != null && !sameRequest.isEmpty()) {
            throw new BusinessException(400, "请求编号已用于其他解锁，请刷新后重试");
        }

        int price = enabledScene().getUnitPrice();
        if (!Objects.equals(price, req.getExpectedPrice())) {
            throw new BusinessException(409, "解锁价格已变化，请重新确认");
        }
        int before = balance(asset);
        if (before < price || assetDao.updateCoinBalance(userId, -price) != 1) {
            throw new BusinessException(5001, "千寻币余额不足");
        }
        LocalDateTime now = LocalDateTime.now();
        UserUnlockRecord record = new UserUnlockRecord();
        record.setUnlockNo("ULK-" + IdUtil.getSnowflakeNextIdStr());
        record.setRequestId(req.getRequestId());
        record.setUserId(userId);
        record.setTargetUserId(targetUserId);
        record.setTargetBizType(TARGET_TYPE);
        record.setTargetBizNo(String.valueOf(targetUserId));
        record.setUnlockScene(SCENE);
        record.setUnlockMethod("coin");
        record.setCoinCost(price);
        record.setEffectiveTime(now);
        record.setExpireTime(null);
        record.setActiveMarker(1);
        record.setStatus(UnlockRecordStatusEnum.ACTIVE.getCode());
        unlockRecordDao.insert(record);

        assetDao.updateLastConsumeTime(userId, now);
        UserCoinLog flow = new UserCoinLog();
        flow.setFlowNo("CF" + IdUtil.getSnowflakeNextIdStr());
        flow.setUserId(userId);
        flow.setFlowType(FlowTypeEnum.CONSUME.getCode());
        flow.setBalanceBefore(before);
        flow.setChangeAmount(-price);
        flow.setBalanceAfter(before - price);
        flow.setBizScene("replay_unlock");
        flow.setBizDesc("解锁三天回放用户主页，目标用户:" + targetUserId);
        flow.setRefId(record.getId());
        flow.setRefType("unlock_record");
        flow.setBizIdempotencyKey("replay:" + userId + ":" + req.getRequestId());
        coinLogDao.insert(flow);
        return unlockedResult(price, before - price);
    }

    private RecommendReplayPageVO requireReplayTarget(Long userId, Long targetUserId,
                                                      boolean issuedToday) {
        RecommendReplayPageVO replay = recommendService.getReplay(userId);
        if (targetUserId == null || targetUserId <= 0 || targetUserId.equals(userId)
                || (!issuedToday && (replay.getItems() == null
                || replay.getItems().stream().noneMatch(item ->
                        String.valueOf(targetUserId).equals(item.getCandidateNo()))))) {
            throw new BusinessException(410, "该用户已不在最近三天回放中，请刷新列表");
        }
        return replay;
    }

    private UserUnlockRecord activeUnlock(Long userId, Long targetUserId) {
        return unlockRecordDao.selectActiveByTargetUser(userId, TARGET_TYPE, targetUserId);
    }

    private boolean hasPaidTargetUnlock(Long userId, Long targetUserId) {
        return activeUnlock(userId, targetUserId) != null
                || unlockRecordDao.selectActiveByTargetUser(userId, IDEAL_TARGET_TYPE, targetUserId) != null;
    }

    private CoinSceneConfig enabledScene() {
        Page<CoinSceneConfig> page = sceneConfigDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<CoinSceneConfig>()
                        .eq(CoinSceneConfig::getSceneCode, SCENE)
                        .eq(CoinSceneConfig::getStatus, CommonStatusEnum.ENABLED.getCode()));
        CoinSceneConfig scene = page == null || page.getRecords().isEmpty() ? null : page.getRecords().get(0);
        if (scene == null || scene.getUnitPrice() == null || scene.getUnitPrice() <= 0) {
            throw new BusinessException(503, "三天回放主页解锁暂不可用");
        }
        return scene;
    }

    private int balance(UserAsset asset) {
        return asset == null || asset.getCoinBalance() == null ? 0 : asset.getCoinBalance();
    }

    private RecommendReplayUnlockVO unlockedResult(int cost, int balance) {
        RecommendReplayUnlockVO result = new RecommendReplayUnlockVO();
        result.setCanOpen(true);
        result.setCoinCost(cost);
        result.setCoinBalance(balance);
        return result;
    }
}

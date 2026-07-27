package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.UnlockSceneEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.UnlockReq;
import com.spacetime.miniapp.dto.response.AssetSummaryVO;
import com.spacetime.miniapp.dto.response.UnlockRecordVO;
import com.spacetime.miniapp.dto.response.UnlockVO;
import com.spacetime.miniapp.service.AssetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 小程序用户资产服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetServiceImpl implements AssetService {

    /** 用户资产数据访问 */
    private final UserAssetDao userAssetDao;
    /** 解锁记录数据访问 */
    private final UserUnlockRecordDao userUnlockRecordDao;
    /** 千寻币流水数据访问 */
    private final UserCoinLogDao userCoinLogDao;

    /** 千寻币消费场景配置数据访问 */
    private final CoinSceneConfigDao coinSceneConfigDao;

    /**
     * 查询用户资产汇总
     *
     * @param userId 用户ID
     * @return 资产汇总信息
     */
    @Override
    public AssetSummaryVO getSummary(Long userId) {
        // 1. 查询用户资产
        UserAsset asset = userAssetDao.selectByUserId(userId);
        // 2. 构造返回对象
        AssetSummaryVO vo = new AssetSummaryVO();
        if (asset != null) {
            vo.setVipStatus(asset.getVipStatus());
            vo.setVipExpireTime(asset.getVipExpireTime());
            vo.setCoinBalance(asset.getCoinBalance());
            vo.setTodayFreeWhisperRemain(asset.getTodayFreeWhisperRemain());
            vo.setTotalRecharge(asset.getTotalRecharge());
        } else {
            vo.setCoinBalance(0);
            vo.setTotalRecharge(BigDecimal.ZERO);
        }
        return vo;
    }

    /**
     * 批量解锁（消耗千寻币解锁指定目标用户）
     *
     * @param userId 当前用户ID
     * @param req    解锁请求（场景 + 目标用户ID列表）
     * @return 解锁结果（解锁人数、消耗千寻币数）
     */
    @Override
    @Transactional
    public UnlockVO unlock(Long userId, UnlockReq req) {
        String requestedScene = req.getUnlockScene();
        List<Long> targetUserIds = req.getTargetUserIds();
        log.info("解锁操作: userId={}, scene={}, count={}", userId, requestedScene,
                targetUserIds != null ? targetUserIds.size() : 0);

        if (isRelationSingleUnlockScene(requestedScene)) {
            throw new BusinessException("喜欢和访客单条解锁必须使用报价、确认两步解锁接口");
        }

        // 1. 校验目标用户列表不为空
        if (targetUserIds == null || targetUserIds.isEmpty()) {
            throw new BusinessException("目标用户列表不能为空");
        }

        // 2. 校验目标用户和后台消费场景
        if (targetUserIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new BusinessException("目标对象不可用");
        }

        // 同一请求重复提交时直接返回，不重复扣币。
        if (req.getRequestId() != null && !req.getRequestId().isBlank()) {
            LambdaQueryWrapper<UserUnlockRecord> requestWrapper = new LambdaQueryWrapper<>();
            requestWrapper.eq(UserUnlockRecord::getUserId, userId)
                    .eq(UserUnlockRecord::getRequestId, req.getRequestId())
                    .eq(UserUnlockRecord::getStatus, UnlockRecordStatusEnum.ACTIVE.getCode());
            Page<UserUnlockRecord> existingRequest = userUnlockRecordDao.selectPage(new Page<>(1, 100), requestWrapper);
            if (existingRequest.getTotal() > 0) {
                UnlockVO result = new UnlockVO();
                result.setUnlockedCount((int) existingRequest.getTotal());
                result.setCoinCost(0);
                return result;
            }
        }

        CoinSceneConfig sceneConfig = getEnabledScene(requestedScene);
        String unlockScene = sceneConfig.getSceneCode();
        if (isIdealScene(unlockScene) && targetUserIds.size() > 5) {
            throw new BusinessException("理想型最多选择 5 位");
        }
        int unitPrice = sceneConfig.getUnitPrice() == null ? 0 : sceneConfig.getUnitPrice();
        if (unitPrice <= 0) {
            throw new BusinessException("当前消费场景暂不可用");
        }

        // 3. 计算总消耗
        int totalCoinCost = unitPrice * targetUserIds.size();

        // 4. 查询用户资产并校验余额
        UserAsset asset = userAssetDao.selectByUserId(userId);
        if (asset == null || asset.getCoinBalance() == null || asset.getCoinBalance() < totalCoinCost) {
            throw new BusinessException("千寻币余额不足");
        }

        // 5. 原子扣除余额
        int updated = userAssetDao.updateCoinBalance(userId, -totalCoinCost);
        if (updated != 1) {
            throw new BusinessException("千寻币余额不足");
        }
        UserAsset updatedAsset = userAssetDao.selectByUserId(userId);
        int newBalance = updatedAsset != null && updatedAsset.getCoinBalance() != null
                ? updatedAsset.getCoinBalance() : asset.getCoinBalance() - totalCoinCost;
        LocalDateTime consumeTime = LocalDateTime.now();
        userAssetDao.updateLastConsumeTime(userId, consumeTime);

        // 6. 计算过期时间
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expireTime = determineExpireTime(unlockScene, now);

        // 7. 批量写入解锁记录并生成千寻币流水
        for (int index = 0; index < targetUserIds.size(); index++) {
            Long targetUserId = targetUserIds.get(index);
            UserUnlockRecord record = new UserUnlockRecord();
            record.setUnlockNo("ULK-" + IdUtil.getSnowflakeNextIdStr());
            record.setUserId(userId);
            record.setRequestId(req.getRequestId());
            record.setTargetUserId(targetUserId);
            record.setUnlockScene(unlockScene);
            record.setUnlockMethod("coin");
            record.setCoinCost(unitPrice);
            record.setEffectiveTime(now);
            record.setExpireTime(sceneConfig.getRetentionDays() == null || sceneConfig.getRetentionDays() <= 0
                    ? expireTime : now.plusDays(sceneConfig.getRetentionDays()));
            record.setActiveMarker(1);
            record.setStatus(UnlockRecordStatusEnum.ACTIVE.getCode());
            userUnlockRecordDao.insert(record);

            // 写千寻币消费流水
            String flowNo = "CF" + IdUtil.getSnowflakeNextIdStr();
            UserCoinLog coinLog = new UserCoinLog();
            coinLog.setFlowNo(flowNo);
            coinLog.setUserId(userId);
            coinLog.setFlowType(FlowTypeEnum.CONSUME.getCode());
            coinLog.setBalanceBefore(newBalance + unitPrice * (targetUserIds.size() - index));
            coinLog.setChangeAmount(-unitPrice);
            coinLog.setBalanceAfter(newBalance + unitPrice * (targetUserIds.size() - index - 1));
            coinLog.setBizScene(mapToBizScene(unlockScene));
            coinLog.setBizDesc("解锁" + (sceneConfig.getMobileName() == null
                    ? getSceneDesc(unlockScene) : sceneConfig.getMobileName()) + "，目标用户:" + targetUserId);
            coinLog.setRefId(record.getId());
            coinLog.setRefType("unlock_record");
            userCoinLogDao.insert(coinLog);
        }

        // 8. 返回解锁结果
        UnlockVO vo = new UnlockVO();
        vo.setUnlockedCount(targetUserIds.size());
        vo.setCoinCost(totalCoinCost);
        return vo;
    }

    private CoinSceneConfig getEnabledScene(String sceneCode) {
        String normalizedScene = normalizeSceneCode(sceneCode);
        LambdaQueryWrapper<CoinSceneConfig> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CoinSceneConfig::getSceneCode, normalizedScene)
                .eq(CoinSceneConfig::getStatus, CommonStatusEnum.ENABLED.getCode());
        Page<CoinSceneConfig> page = coinSceneConfigDao.selectPage(new Page<>(1, 1), wrapper);
        if (page.getRecords().isEmpty()) {
            throw new BusinessException("当前消费场景暂不可用");
        }
        return page.getRecords().get(0);
    }

    /** 将业务页面仍可能传入的旧编码归一到 PRD-04 的后台配置编码。 */
    private String normalizeSceneCode(String sceneCode) {
        if (UnlockSceneEnum.LIKES.getCode().equals(sceneCode)) {
            return "likes_unlock_one";
        }
        if (UnlockSceneEnum.VIEWERS.getCode().equals(sceneCode)) {
            return "viewers_unlock_one";
        }
        if (UnlockSceneEnum.IDEAL_USER.getCode().equals(sceneCode)) {
            return "ideal_user_unlock";
        }
        if (UnlockSceneEnum.FEATURED_PROFILE.getCode().equals(sceneCode)) {
            return "compatible_person_unlock_one";
        }
        return sceneCode;
    }

    private boolean isRelationSingleUnlockScene(String sceneCode) {
        return UnlockSceneEnum.LIKES.getCode().equals(sceneCode)
                || UnlockSceneEnum.VIEWERS.getCode().equals(sceneCode)
                || "likes_unlock_one".equals(sceneCode)
                || "viewers_unlock_one".equals(sceneCode);
    }

    private boolean isIdealScene(String sceneCode) {
        return "ideal_user_unlock".equals(sceneCode)
                || "ideal_batch_unlock".equals(sceneCode)
                || UnlockSceneEnum.IDEAL_USER.getCode().equals(sceneCode);
    }

    /**
     * 分页查询用户解锁记录
     *
     * @param userId 用户ID
     * @param req    分页请求参数
     * @return 解锁记录分页列表
     */
    @Override
    public Page<UnlockRecordVO> getRecords(Long userId, PageReq req) {
        // 1. 分页查询用户解锁记录
        LambdaQueryWrapper<UserUnlockRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserUnlockRecord::getUserId, userId)
                .orderByDesc(UserUnlockRecord::getCreateTime);
        Page<UserUnlockRecord> recordPage = userUnlockRecordDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        // 2. 转换为 VO 分页
        Page<UnlockRecordVO> resultPage = new Page<>(recordPage.getCurrent(), recordPage.getSize(), recordPage.getTotal());
        resultPage.setRecords(recordPage.getRecords().stream().map(record -> {
            UnlockRecordVO vo = new UnlockRecordVO();
            vo.setId(record.getId());
            vo.setUnlockScene(record.getUnlockScene());
            vo.setUnlockMethod(record.getUnlockMethod());
            vo.setCoinCost(record.getCoinCost());
            vo.setEffectiveTime(record.getEffectiveTime());
            vo.setExpireTime(record.getExpireTime());
            vo.setStatus(record.getStatus());
            return vo;
        }).collect(Collectors.toList()));
        return resultPage;
    }

    /** 兼容旧场景的保留期兜底，当前新场景以后台配置为准。 */
    private LocalDateTime determineExpireTime(String unlockScene, LocalDateTime now) {
        if (UnlockSceneEnum.IDEAL_USER.getCode().equals(unlockScene)) {
            return now.plusDays(90);
        }
        if (UnlockSceneEnum.FEATURED_PROFILE.getCode().equals(unlockScene)) {
            return now.plusDays(3);
        }
        // likes/viewers: 永久有效
        return null;
    }

    /** 解锁场景映射到业务场景 */
    private String mapToBizScene(String unlockScene) {
        if (UnlockSceneEnum.LIKES.getCode().equals(unlockScene)
                || "likes_unlock_one".equals(unlockScene)) {
            return BizSceneEnum.LIKES_UNLOCK.getCode();
        }
        if (UnlockSceneEnum.VIEWERS.getCode().equals(unlockScene)
                || "viewers_unlock_one".equals(unlockScene)) {
            return BizSceneEnum.VIEWERS_UNLOCK.getCode();
        }
        if (UnlockSceneEnum.IDEAL_USER.getCode().equals(unlockScene)
                || "ideal_user_unlock".equals(unlockScene)
                || "ideal_batch_unlock".equals(unlockScene)) {
            return BizSceneEnum.IDEAL_UNLOCK.getCode();
        }
        if (UnlockSceneEnum.FEATURED_PROFILE.getCode().equals(unlockScene)
                || "compatible_person_unlock_one".equals(unlockScene)) {
            return BizSceneEnum.FEATURED_UNLOCK.getCode();
        }
        return unlockScene;
    }

    /** 获取场景中文描述 */
    private String getSceneDesc(String unlockScene) {
        if (UnlockSceneEnum.LIKES.getCode().equals(unlockScene)) {
            return "谁喜欢我";
        }
        if (UnlockSceneEnum.VIEWERS.getCode().equals(unlockScene)) {
            return "谁看过我";
        }
        if (UnlockSceneEnum.IDEAL_USER.getCode().equals(unlockScene)) {
            return "理想型";
        }
        if (UnlockSceneEnum.FEATURED_PROFILE.getCode().equals(unlockScene)) {
            return "精选推荐置顶";
        }
        return unlockScene;
    }
}

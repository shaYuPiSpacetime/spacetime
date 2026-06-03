package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.miniapp.service.CoinLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 成家币流水服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoinLogServiceImpl implements CoinLogService {
    private final UserAssetDao userAssetDao;
    private final UserCoinLogDao userCoinLogDao;

    @Override
    @Transactional
    public Long addCoin(Long userId, Integer amount, String bizScene, Long refId, String refType) {
        // 1. 查询或创建用户资产（如果不存在则创建，初始余额为0）
        UserAsset asset = userAssetDao.selectByUserId(userId);
        if (asset == null) {
            asset = new UserAsset();
            asset.setUserId(userId);
            asset.setCoinBalance(0);
            userAssetDao.insert(asset);
        }

        // 2. 原子更新成家币余额（行级锁，coin_balance = coin_balance + amount）
        userAssetDao.updateCoinBalance(userId, amount);

        // 3. 重新查询获取更新后的余额
        asset = userAssetDao.selectByUserId(userId);

        // 4. 生成流水号（时间戳 + 随机字符）
        String flowNo = "COIN" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + UUID.randomUUID().toString().substring(0, 6);

        // 5. 写入成家币流水记录
        UserCoinLog coinLog = new UserCoinLog();
        coinLog.setFlowNo(flowNo);
        coinLog.setUserId(userId);
        coinLog.setFlowType(FlowTypeEnum.RECHARGE.getCode());
        coinLog.setChangeAmount(amount);
        coinLog.setBalanceAfter(asset.getCoinBalance());
        coinLog.setBizScene(bizScene);
        coinLog.setBizDesc(bizScene);
        coinLog.setRefId(refId);
        coinLog.setRefType(refType);
        userCoinLogDao.insert(coinLog);

        log.info("addCoin: userId={}, amount={}, balanceAfter={}, bizScene={}, flowNo={}",
                userId, amount, asset.getCoinBalance(), bizScene, flowNo);
        return coinLog.getId();
    }
}

package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.enums.VipStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.UserAssetGrantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/** 赠送入账、会员顺延和回执在同一事务提交，不伪造收入。 */
@Service
@RequiredArgsConstructor
public class UserAssetGrantServiceImpl implements UserAssetGrantService {
    private final AppUserDao users;
    private final UserAssetDao assets;
    private final UserAssetGrantDao grants;
    private final UserCoinLogDao coins;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserAssetGrant grant(Long userId, int vipDays, int coinAmount, String key, String source,
            String reason, Long operatorId, String operatorName) {
        if (vipDays < 0 || vipDays > 36500 || coinAmount < 0 || (vipDays == 0 && coinAmount == 0))
            throw new BusinessException("请填写正整数会员天数或千寻币数量，会员天数最多 36500 天");
        if (reason == null || reason.isBlank() || reason.length() > 200)
            throw new BusinessException("赠送原因必填且不超过 200 字");
        if (users.selectById(userId) == null) throw new BusinessException("用户不存在");
        // 先锁定资产，所有发放及付费会员使用同一行锁串行计算。
        UserAsset asset = assets.selectByUserIdForUpdate(userId);
        if (asset == null) throw new BusinessException("用户资产账户尚未建立，请先完成注册");
        UserAssetGrant existing = grants.findByKeyForUpdate(key);
        if (existing != null) {
            if (!Objects.equals(existing.getUserId(), userId) || !Objects.equals(existing.getVipDays(), vipDays)
                    || !Objects.equals(existing.getCoinAmount(), coinAmount)
                    || !Objects.equals(existing.getReason(), reason.trim())
                    || !Objects.equals(existing.getOperatorId(), operatorId))
                throw new BusinessException("请求编号已用于其他赠送，请刷新后重试");
            return existing;
        }
        int before = asset.getCoinBalance() == null ? 0 : asset.getCoinBalance();
        if ((long) before + coinAmount > Integer.MAX_VALUE) throw new BusinessException("赠送后余额超出允许范围");
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oldExpire = asset.getVipExpireTime();
        LocalDateTime newExpire = oldExpire;
        if (vipDays > 0) {
            LocalDateTime base = VipStatusEnum.ACTIVE.getCode().equals(asset.getVipStatus())
                    && oldExpire != null && oldExpire.isAfter(now) ? oldExpire : now;
            newExpire = base.plusDays(vipDays);
            asset.setVipStatus(VipStatusEnum.ACTIVE.getCode());
            asset.setVipExpireTime(newExpire);
        }
        asset.setCoinBalance(before + coinAmount);
        assets.updateById(asset);
        UserAssetGrant receipt = new UserAssetGrant();
        receipt.setUserId(userId); receipt.setIdempotencyKey(key); receipt.setSource(source);
        receipt.setVipDays(vipDays); receipt.setCoinAmount(coinAmount);
        receipt.setBalanceBefore(before); receipt.setBalanceAfter(before + coinAmount);
        receipt.setVipExpireBefore(oldExpire); receipt.setVipExpireAfter(newExpire);
        receipt.setReason(reason.trim()); receipt.setOperatorId(operatorId); receipt.setOperatorName(operatorName);
        grants.insert(receipt);
        if (coinAmount > 0) {
            UserCoinLog log = new UserCoinLog();
            log.setFlowNo("CL-" + IdUtil.getSnowflakeNextIdStr()); log.setUserId(userId);
            log.setFlowType(FlowTypeEnum.GIFT.getCode()); log.setChangeAmount(coinAmount);
            log.setBalanceBefore(before); log.setBalanceAfter(before + coinAmount);
            log.setBizScene(source); log.setBizDesc(reason.trim());
            log.setRefId(receipt.getId()); log.setRefType("asset_grant"); log.setBizIdempotencyKey(key);
            coins.insert(log);
        }
        return receipt;
    }

    @Override
    public List<UserAssetGrant> recent(Long userId) { return grants.recent(userId); }
}

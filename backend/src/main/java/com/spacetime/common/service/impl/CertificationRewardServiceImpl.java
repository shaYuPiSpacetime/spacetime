package com.spacetime.common.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.*;
import com.spacetime.common.service.CertificationRewardService;
import com.spacetime.common.service.UserAssetGrantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/** 一次性本人认证奖励；不与邀请人奖励混用。 */
@Service
@RequiredArgsConstructor
public class CertificationRewardServiceImpl implements CertificationRewardService {
    private final AppConfigDao configs;
    private final AppUserDao users;
    private final AppUserAuditRecordDao audits;
    private final UserAssetDao assets;
    private final UserAssetGrantDao grants;
    private final UserAssetGrantService grantService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void grantIfEligible(Long userId) {
        AppConfig config = configs.selectByKey(CONFIG_KEY);
        if (config == null || !CommonStatusEnum.ENABLED.getCode().equals(config.getStatus())) return;
        int amount;
        try { amount = Integer.parseInt(config.getConfigValue()); }
        catch (RuntimeException ex) { return; }
        if (amount <= 0) return;
        // 与资料保存、审核通过统一按用户行再资产行的顺序加锁。
        AppUser user = users.selectOne(new LambdaQueryWrapper<AppUser>().eq(AppUser::getId, userId).last("FOR UPDATE"));
        if (user == null || !Integer.valueOf(1).equals(user.getBasicProfileCompleted())) return;
        if (assets.selectByUserIdForUpdate(userId) == null) return;
        String key = "certification:" + userId;
        if (grants.findByKeyForUpdate(key) != null) return;
        for (AppUserAuditTypeEnum type : List.of(AppUserAuditTypeEnum.REAL_NAME,
                AppUserAuditTypeEnum.AVATAR, AppUserAuditTypeEnum.EDUCATION)) {
            LambdaQueryWrapper<AppUserAuditRecord> query = new LambdaQueryWrapper<AppUserAuditRecord>()
                    .eq(AppUserAuditRecord::getUserId, userId).eq(AppUserAuditRecord::getAuditType, type.getCode());
            // 头像必须以最新提交结果为准，实名和学历沿用现有有效认证口径。
            if (type != AppUserAuditTypeEnum.AVATAR) query.eq(AppUserAuditRecord::getStatus, AppUserAuditStatusEnum.APPROVED.getCode());
            AppUserAuditRecord record = audits.selectOne(query.orderByDesc(AppUserAuditRecord::getSubmitTime)
                    .orderByDesc(AppUserAuditRecord::getId).last("LIMIT 1 FOR UPDATE"));
            if (record == null || !AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus())) return;
        }
        grantService.grant(userId, 0, amount, key, AssetGrantSourceEnum.CERTIFICATION.getCode(),
                "完成资料与认证奖励", null, "系统");
    }
}

package com.spacetime.common.service;

import com.spacetime.common.entity.UserAssetGrant;
import java.util.List;

/** 用户资产赠送服务，独立于付费订单。 */
public interface UserAssetGrantService {
    /** 同事务发放会员和千寻币；重试只返回原记录。 */
    UserAssetGrant grant(Long userId, int vipDays, int coins, String key, String source,
            String reason, Long operatorId, String operatorName);
    /** 查询最近发放记录。 */
    List<UserAssetGrant> recent(Long userId);
}

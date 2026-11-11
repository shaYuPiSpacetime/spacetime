package com.spacetime.common.dao;

import com.spacetime.common.entity.UserAssetGrant;
import java.util.List;

/** 资产赠送台账数据访问。 */
public interface UserAssetGrantDao {
    /** 当前读锁定幂等记录，避免事务快照读到旧状态。 */
    UserAssetGrant findByKeyForUpdate(String key);
    /** 写入完整发放回执。 */
    void insert(UserAssetGrant grant);
    /** 查询用户最近五十笔发放回执。 */
    List<UserAssetGrant> recent(Long userId);
}

package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.UserAsset;

/**
 * 用户资产数据访问接口
 */
public interface UserAssetDao {
    UserAsset selectById(Long id);
    /** 根据用户 ID 查询资产 */
    UserAsset selectByUserId(Long userId);
    /** 在当前事务内按用户 ID 查询并锁定资产行。 */
    UserAsset selectByUserIdForUpdate(Long userId);
    /** 原子消费一次免费悄悄话权益。 */
    int consumeFreeWhisper(Long userId);
    /** 同步今日免费悄悄话剩余次数投影，业务事实以悄悄话记录计数为准。 */
    int updateFreeWhisperProjection(Long userId, Integer remain);
    Page<UserAsset> selectPage(Page<UserAsset> page, LambdaQueryWrapper<UserAsset> wrapper);
    void insert(UserAsset entity);
    void updateById(UserAsset entity);
    /** 原子更新成家币余额 */
    int updateCoinBalance(Long userId, Integer delta);
    /** 原子增加累计充值金额并记录最后购买时间，不覆盖并发更新的币余额 */
    int updateRechargeStats(Long userId, java.math.BigDecimal amount, java.time.LocalDateTime purchaseTime);
    /** 更新最后消费时间，不覆盖并发更新的币余额 */
    int updateLastConsumeTime(Long userId, java.time.LocalDateTime consumeTime);
    /** 原子将已到期会员更新为 expired */
    int expireVipMemberships(java.time.LocalDateTime expireBefore);
    /** 查询会员状态前，仅更新指定用户的到期状态 */
    int expireVipMembership(Long userId, java.time.LocalDateTime expireBefore);
    void deleteById(Long id);
}

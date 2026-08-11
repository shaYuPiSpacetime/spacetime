package com.spacetime.common.dao;

import com.spacetime.common.entity.AppUserImAccount;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** 平台用户与腾讯云 TIM 账号映射数据访问接口。 */
public interface AppUserImAccountDao {
    AppUserImAccount selectById(Long id);
    AppUserImAccount selectByUserId(Long userId);
    List<AppUserImAccount> selectByUserIds(Collection<Long> userIds);
    AppUserImAccount selectByImUserId(String imUserId);
    List<AppUserImAccount> selectRetryCandidates(LocalDateTime retryBefore, int limit);
    int claimForSync(Long id, Integer version, LocalDateTime claimedAt);
    int markDisabled(Long id, Integer version, LocalDateTime disabledAt);
    void insert(AppUserImAccount entity);
    int updateById(AppUserImAccount entity);
}

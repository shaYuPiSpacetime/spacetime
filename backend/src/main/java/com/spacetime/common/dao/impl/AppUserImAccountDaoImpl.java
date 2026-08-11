package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.mapper.AppUserImAccountMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** 平台用户与腾讯云 TIM 账号映射数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppUserImAccountDaoImpl implements AppUserImAccountDao {
    private final AppUserImAccountMapper mapper;

    @Override
    public AppUserImAccount selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserImAccount selectByUserId(Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppUserImAccount>()
                .eq(AppUserImAccount::getUserId, userId));
    }

    @Override
    public List<AppUserImAccount> selectByUserIds(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(new LambdaQueryWrapper<AppUserImAccount>()
                .in(AppUserImAccount::getUserId, userIds));
    }

    @Override
    public AppUserImAccount selectByImUserId(String imUserId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppUserImAccount>()
                .eq(AppUserImAccount::getImUserId, imUserId));
    }

    @Override
    public List<AppUserImAccount> selectRetryCandidates(LocalDateTime retryBefore, int limit) {
        return mapper.selectRetryCandidates(retryBefore, Math.max(1, Math.min(limit, 500)));
    }

    @Override
    public int claimForSync(Long id, Integer version, LocalDateTime claimedAt) {
        return mapper.claimForSync(id, version == null ? 0 : version, claimedAt);
    }

    @Override
    public int markDisabled(Long id, Integer version, LocalDateTime disabledAt) {
        return mapper.markDisabled(id, version == null ? 0 : version, disabledAt);
    }

    @Override
    public void insert(AppUserImAccount entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(AppUserImAccount entity) {
        return mapper.updateById(entity);
    }
}

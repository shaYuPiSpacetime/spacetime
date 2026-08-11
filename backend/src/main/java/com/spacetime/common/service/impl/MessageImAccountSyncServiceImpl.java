package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.provider.InstantMessageAccountProvider;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.common.service.MessageImAccountSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 使用账号行版本 CAS 认领，补偿腾讯云 TIM 账号导入。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageImAccountSyncServiceImpl implements MessageImAccountSyncService {
    private static final int MAX_BATCH_SIZE = 500;

    private final AppUserImAccountDao accountDao;
    private final AppUserDao userDao;
    private final InstantMessageAccountProvider accountProvider;

    @Override
    public int syncPending(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        int batchSize = Math.max(1, Math.min(limit, MAX_BATCH_SIZE));
        List<AppUserImAccount> candidates = accountDao.selectRetryCandidates(
                effectiveNow.minusMinutes(1), batchSize);
        if (candidates == null || candidates.isEmpty()) {
            return 0;
        }
        int claimed = 0;
        for (AppUserImAccount account : candidates) {
            int version = account.getVersion() == null ? 0 : account.getVersion();
            if (accountDao.claimForSync(account.getId(), version, effectiveNow) != 1) {
                continue;
            }
            claimed++;
            AppUser user = userDao.selectById(account.getUserId());
            if (user == null || !AccountStatusEnum.NORMAL.getCode().equals(user.getAccountStatus())) {
                accountDao.markDisabled(account.getId(), version + 1, effectiveNow);
                continue;
            }
            try {
                accountProvider.syncAccount(account.getUserId(), user.getNickname(), null);
            } catch (InstantMessageException ex) {
                log.warn("TIM账号补偿同步失败: userId={}, providerCode={}",
                        account.getUserId(), ex.getProviderCode());
            } catch (RuntimeException ex) {
                log.warn("TIM账号补偿同步异常: userId={}, errorType={}",
                        account.getUserId(), ex.getClass().getSimpleName());
            }
        }
        return claimed;
    }
}

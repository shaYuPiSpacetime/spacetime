package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.service.AccountStatusMessageNotificationService;
import com.spacetime.common.service.MessageAccountFactReconcileService;
import com.spacetime.common.service.RelationLifecycleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** 最近 24 小时账号受限事实对账。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageAccountFactReconcileServiceImpl implements MessageAccountFactReconcileService {
    private static final int MAX_LIMIT = 1000;

    private final AppUserDao appUserDao;
    private final RelationLifecycleService relationLifecycleService;
    private final AccountStatusMessageNotificationService notificationService;

    @Override
    public int reconcileRecentAccountStatuses(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        int boundedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        List<AppUser> users = appUserDao.selectRestrictedWithoutMessage(
                effectiveNow.minusHours(24), boundedLimit);
        if (users == null || users.isEmpty()) {
            return 0;
        }
        int reconciled = 0;
        for (AppUser user : users) {
            try {
                LocalDateTime changedAt = user.getUpdateTime() == null
                        ? effectiveNow : user.getUpdateTime();
                relationLifecycleService.invalidateByUser(user.getId(), reason(user), changedAt);
                if (notificationService.publishNow(
                        user.getId(), user.getAccountStatus(), changedAt)) {
                    reconciled++;
                }
            } catch (RuntimeException ex) {
                log.warn("账号消息事实对账失败: userId={}, status={}, errorType={}",
                        user.getId(), user.getAccountStatus(), ex.getClass().getSimpleName());
            }
        }
        return reconciled;
    }

    private RelationInvalidReasonEnum reason(AppUser user) {
        return AccountStatusEnum.FROZEN.getCode().equals(user.getAccountStatus())
                ? RelationInvalidReasonEnum.ACCOUNT_FROZEN
                : RelationInvalidReasonEnum.ACCOUNT_DELETED;
    }
}

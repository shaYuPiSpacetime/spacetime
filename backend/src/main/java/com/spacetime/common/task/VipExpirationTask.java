package com.spacetime.common.task;

import com.spacetime.common.dao.UserAssetDao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 会员到期状态维护任务。 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VipExpirationTask {

    private final UserAssetDao userAssetDao;

    /** 每分钟扫描一次到期会员，执行间隔可通过配置调整。 */
    @Scheduled(
            fixedDelayString = "${commercial.vip-expiration.fixed-delay-ms:60000}",
            initialDelayString = "${commercial.vip-expiration.initial-delay-ms:10000}"
    )
    public void expireMemberships() {
        int affected = userAssetDao.expireVipMemberships(LocalDateTime.now());
        if (affected > 0) {
            log.info("会员到期状态更新完成: affected={}", affected);
        }
    }
}

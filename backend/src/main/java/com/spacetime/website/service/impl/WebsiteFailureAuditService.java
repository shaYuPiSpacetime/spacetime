package com.spacetime.website.service.impl;

import com.spacetime.common.dao.WebsiteDao;
import com.spacetime.common.website.WebsiteData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** 登录失败也需要单独提交审计记录，避免随登录事务回滚。 */
@Service
@RequiredArgsConstructor
public class WebsiteFailureAuditService {
    private final WebsiteDao dao;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void loginFailed(String requestIp, String userAgent) {
        WebsiteData.AuditLog log = new WebsiteData.AuditLog();
        log.setActorType("USER");
        log.setAction("LOGIN_FAILED");
        log.setTargetType("USER");
        log.setRequestIp(requestIp);
        if (userAgent != null) log.setUserAgent(userAgent.substring(0, Math.min(255, userAgent.length())));
        log.setRetainUntil(LocalDateTime.now().plusDays(190));
        dao.insertAudit(log);
    }
}

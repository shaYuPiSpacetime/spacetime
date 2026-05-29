package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.entity.AppUserSecurityAuditLog;
import com.spacetime.common.entity.SysUser;

import java.time.format.DateTimeFormatter;

abstract class UserSecurityBaseSupport {
    protected static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    protected String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    protected String displayName(SysUser user, Long fallbackId) {
        if (user == null) {
            return "用户" + fallbackId;
        }
        return user.getNickname() != null && !user.getNickname().isBlank() ? user.getNickname() : user.getUsername();
    }

    protected void writeAudit(AppUserSecurityAuditLogDao dao, Long userId, Long operatorId, String bizType,
                              Long bizId, String action, String beforeValue, String afterValue) {
        AppUserSecurityAuditLog log = new AppUserSecurityAuditLog();
        log.setUserId(userId);
        log.setOperatorId(operatorId);
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        dao.insert(log);
    }
}

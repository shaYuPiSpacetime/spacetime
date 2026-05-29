package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.entity.AppUserSecurityAuditLog;
import com.spacetime.common.mapper.AppUserSecurityAuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AppUserSecurityAuditLogDaoImpl implements AppUserSecurityAuditLogDao {
    private final AppUserSecurityAuditLogMapper mapper;

    @Override
    public void insert(AppUserSecurityAuditLog entity) {
        mapper.insert(entity);
    }
}

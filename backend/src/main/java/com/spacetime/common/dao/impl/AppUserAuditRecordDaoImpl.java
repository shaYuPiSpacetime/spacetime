package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.mapper.AppUserAuditRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * App 用户统一审核记录 DAO 实现。
 */
@Repository
@RequiredArgsConstructor
public class AppUserAuditRecordDaoImpl implements AppUserAuditRecordDao {
    private final AppUserAuditRecordMapper mapper;

    @Override
    public AppUserAuditRecord selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppUserAuditRecord selectOne(LambdaQueryWrapper<AppUserAuditRecord> wrapper) {
        return mapper.selectOne(wrapper);
    }

    @Override
    public Long count(LambdaQueryWrapper<AppUserAuditRecord> wrapper) {
        return mapper.selectCount(wrapper);
    }

    @Override
    public Page<AppUserAuditRecord> selectPage(Page<AppUserAuditRecord> page, LambdaQueryWrapper<AppUserAuditRecord> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<AppUserAuditRecord> selectList(LambdaQueryWrapper<AppUserAuditRecord> wrapper) {
        return mapper.selectList(wrapper);
    }

    @Override
    public void insert(AppUserAuditRecord entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppUserAuditRecord entity) {
        mapper.updateById(entity);
    }

    @Override
    public void updateAuditResult(AppUserAuditRecord entity) {
        mapper.update(null, new LambdaUpdateWrapper<AppUserAuditRecord>()
                .eq(AppUserAuditRecord::getId, entity.getId())
                .set(AppUserAuditRecord::getStatus, entity.getStatus())
                .set(AppUserAuditRecord::getAuditSource, entity.getAuditSource())
                .set(AppUserAuditRecord::getProviderTaskId, entity.getProviderTaskId())
                .set(AppUserAuditRecord::getMachineSignalJson, entity.getMachineSignalJson())
                .set(AppUserAuditRecord::getRejectReason, entity.getRejectReason())
                .set(AppUserAuditRecord::getExpiredReason, entity.getExpiredReason())
                .set(AppUserAuditRecord::getAuditTime, entity.getAuditTime())
                .set(AppUserAuditRecord::getAuditorId, entity.getAuditorId()));
    }
}

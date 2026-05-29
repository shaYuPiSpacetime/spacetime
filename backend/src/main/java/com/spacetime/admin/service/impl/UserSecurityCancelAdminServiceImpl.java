package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.CancelRequestPageReq;
import com.spacetime.admin.dto.request.CancelRequestRemarkReq;
import com.spacetime.admin.dto.response.AdminCancelRequestVO;
import com.spacetime.admin.service.UserSecurityCancelAdminService;
import com.spacetime.common.dao.AppUserCancelRequestDao;
import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.AppUserCancelRequest;
import com.spacetime.common.entity.AppUserSecurityAuditLog;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.CancelRequestStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class UserSecurityCancelAdminServiceImpl implements UserSecurityCancelAdminService {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserCancelRequestDao cancelRequestDao;
    private final AppUserSecurityAuditLogDao auditLogDao;
    private final UserDao userDao;

    @Override
    public Page<AdminCancelRequestVO> list(CancelRequestPageReq req) {
        LambdaQueryWrapper<AppUserCancelRequest> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(req.getUserId() != null, AppUserCancelRequest::getUserId, req.getUserId());
        wrapper.eq(StringUtils.hasText(req.getStatus()), AppUserCancelRequest::getStatus, req.getStatus());
        wrapper.orderByDesc(AppUserCancelRequest::getCreateTime);
        Page<AppUserCancelRequest> result = cancelRequestDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<AdminCancelRequestVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toVO).toList());
        return voPage;
    }

    @Override
    public AdminCancelRequestVO detail(Long id) {
        AppUserCancelRequest entity = cancelRequestDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("注销申请不存在");
        }
        return toVO(entity);
    }

    @Override
    @Transactional
    public void remark(Long id, CancelRequestRemarkReq req) {
        AppUserCancelRequest entity = cancelRequestDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("注销申请不存在");
        }
        String before = entity.getRemark() + "|" + entity.getBlockReason() + "|" + entity.getStatus();
        entity.setRemark(req.getRemark());
        entity.setBlockReason(req.getBlockReason());
        if (StringUtils.hasText(req.getBlockReason()) && CancelRequestStatusEnum.COOLING_OFF.getCode().equals(entity.getStatus())) {
            entity.setStatus(CancelRequestStatusEnum.BLOCKED.getCode());
        }
        cancelRequestDao.updateById(entity);
        writeAudit(entity.getUserId(), id, before, entity.getRemark() + "|" + entity.getBlockReason() + "|" + entity.getStatus());
    }

    private AdminCancelRequestVO toVO(AppUserCancelRequest entity) {
        SysUser user = userDao.selectById(entity.getUserId());
        AdminCancelRequestVO vo = new AdminCancelRequestVO();
        vo.setId(entity.getId());
        vo.setUserId(entity.getUserId());
        vo.setNickname(user != null && StringUtils.hasText(user.getNickname()) ? user.getNickname() : "用户" + entity.getUserId());
        vo.setStatus(entity.getStatus());
        vo.setReason(entity.getReason());
        vo.setBlockReason(entity.getBlockReason());
        vo.setRemark(entity.getRemark());
        vo.setCoolingEndTime(entity.getCoolingEndTime() != null ? entity.getCoolingEndTime().format(FMT) : null);
        vo.setRevokedTime(entity.getRevokedTime() != null ? entity.getRevokedTime().format(FMT) : null);
        vo.setFinalCancelTime(entity.getFinalCancelTime() != null ? entity.getFinalCancelTime().format(FMT) : null);
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }

    private void writeAudit(Long userId, Long bizId, String before, String after) {
        AppUserSecurityAuditLog log = new AppUserSecurityAuditLog();
        log.setUserId(userId);
        log.setOperatorId(UserContextHolder.get() != null ? UserContextHolder.get().getId() : null);
        log.setBizType("ACCOUNT_CANCEL");
        log.setBizId(bizId);
        log.setAction("REMARK");
        log.setBeforeValue(before);
        log.setAfterValue(after);
        auditLogDao.insert(log);
    }
}

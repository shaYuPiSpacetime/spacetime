package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionRewardPageReq;
import com.spacetime.admin.dto.response.PromotionRewardLogVO;
import com.spacetime.admin.service.PromotionRewardAdminService;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 邀请奖励后台服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionRewardAdminServiceImpl implements PromotionRewardAdminService {
    private final PromotionRewardLogDao rewardLogDao;
    private final PromotionAuditLogDao auditLogDao;
    private final UserDao userDao;

    @Override
    public Page<PromotionRewardLogVO> list(PromotionRewardPageReq req) {
        java.util.List<Long> inviterIds = findUserIds(req.getInviterKeyword());
        java.util.List<Long> inviteeIds = findUserIds(req.getInviteeKeyword());
        if (StrUtil.isNotBlank(req.getInviterKeyword()) && inviterIds.isEmpty()
                || StrUtil.isNotBlank(req.getInviteeKeyword()) && inviteeIds.isEmpty()) {
            return new Page<>(req.getPage(), req.getSize(), 0);
        }
        LambdaQueryWrapper<PromotionRewardLog> wrapper = new LambdaQueryWrapper<PromotionRewardLog>()
                .like(StrUtil.isNotBlank(req.getRewardNo()), PromotionRewardLog::getRewardNo, req.getRewardNo())
                .eq(req.getInviterId() != null, PromotionRewardLog::getInviterId, req.getInviterId())
                .in(!inviterIds.isEmpty(), PromotionRewardLog::getInviterId, inviterIds)
                .eq(req.getInviteeId() != null, PromotionRewardLog::getInviteeId, req.getInviteeId())
                .in(!inviteeIds.isEmpty(), PromotionRewardLog::getInviteeId, inviteeIds)
                .eq(StrUtil.isNotBlank(req.getEventType()), PromotionRewardLog::getEventType, req.getEventType())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionRewardLog::getStatus, req.getStatus())
                .ge(req.getStartTime() != null, PromotionRewardLog::getCreateTime, req.getStartTime())
                .le(req.getEndTime() != null, PromotionRewardLog::getCreateTime, req.getEndTime())
                .orderByDesc(PromotionRewardLog::getCreateTime);
        Page<PromotionRewardLog> page = rewardLogDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionRewardLogVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    private java.util.List<Long> findUserIds(String keyword) {
        if (StrUtil.isBlank(keyword)) {
            return java.util.List.of();
        }
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<SysUser>()
                .like(SysUser::getNickname, keyword)
                .or()
                .like(SysUser::getUsername, keyword)
                .or()
                .like(SysUser::getPhone, keyword);
        return userDao.selectPage(new Page<>(1, 100), wrapper).getRecords().stream()
                .map(SysUser::getId)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Override
    public Page<PromotionRewardLogVO> frozen(int page, int size) {
        PromotionRewardPageReq req = new PromotionRewardPageReq();
        req.setPage(page);
        req.setSize(size);
        req.setStatus(PromotionRewardStatusEnum.FROZEN.getCode());
        return list(req);
    }

    @Override
    @Transactional
    public void approve(Long id, String remark) {
        PromotionRewardLog log = requireFrozen(id);
        log.setStatus(PromotionRewardStatusEnum.SUCCESS.getCode());
        log.setReviewTime(LocalDateTime.now());
        log.setReviewRemark(remark);
        log.setArriveTime(LocalDateTime.now());
        rewardLogDao.updateById(log);
        audit("reward", id, "approve", PromotionRewardStatusEnum.FROZEN.getCode(), remark);
    }

    @Override
    @Transactional
    public void reject(Long id, String remark) {
        PromotionRewardLog log = requireFrozen(id);
        log.setStatus(PromotionRewardStatusEnum.INVALID.getCode());
        log.setReviewTime(LocalDateTime.now());
        log.setReviewRemark(remark);
        rewardLogDao.updateById(log);
        audit("reward", id, "reject", PromotionRewardStatusEnum.FROZEN.getCode(), remark);
    }

    private PromotionRewardLog requireFrozen(Long id) {
        PromotionRewardLog log = rewardLogDao.selectById(id);
        if (log == null) {
            throw new BusinessException("奖励流水不存在");
        }
        if (!PromotionRewardStatusEnum.FROZEN.getCode().equals(log.getStatus())) {
            throw new BusinessException("只有冻结中的奖励可以复核");
        }
        return log;
    }

    private void audit(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        PromotionAuditLog audit = new PromotionAuditLog();
        audit.setBizType(bizType);
        audit.setBizId(bizId);
        audit.setAction(action);
        audit.setBeforeValue(beforeValue);
        audit.setAfterValue(afterValue);
        auditLogDao.insert(audit);
    }

    private PromotionRewardLogVO toVO(PromotionRewardLog entity) {
        PromotionRewardLogVO vo = new PromotionRewardLogVO();
        vo.setId(entity.getId());
        vo.setRewardNo(entity.getRewardNo());
        vo.setRelationId(entity.getRelationId());
        vo.setInviterId(entity.getInviterId());
        SysUser inviter = user(entity.getInviterId());
        vo.setInviterUuid(userUuid(inviter, entity.getInviterId()));
        vo.setInviterName(userDisplayName(inviter));
        vo.setInviterPhone(inviter == null ? null : inviter.getPhone());
        vo.setInviteeId(entity.getInviteeId());
        SysUser invitee = user(entity.getInviteeId());
        vo.setInviteeUuid(userUuid(invitee, entity.getInviteeId()));
        vo.setInviteeName(userDisplayName(invitee));
        vo.setInviteePhone(invitee == null ? null : invitee.getPhone());
        vo.setEventType(entity.getEventType());
        vo.setRewardCoin(entity.getRewardCoin());
        vo.setStatus(entity.getStatus());
        vo.setRiskReason(entity.getRiskReason());
        vo.setFrozenTime(PromotionRewardStatusEnum.FROZEN.getCode().equals(entity.getStatus()) ? entity.getCreateTime() : null);
        vo.setArriveTime(entity.getArriveTime());
        vo.setReviewTime(entity.getReviewTime());
        vo.setReviewRemark(entity.getReviewRemark());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    private SysUser user(Long userId) {
        return userId == null ? null : userDao.selectById(userId);
    }

    private String userUuid(SysUser user, Long userId) {
        if (user == null) {
            return userId == null ? null : String.valueOf(userId);
        }
        return StrUtil.blankToDefault(user.getUsername(), String.valueOf(user.getId()));
    }

    private String userDisplayName(SysUser user) {
        if (user == null) {
            return null;
        }
        return StrUtil.blankToDefault(user.getNickname(), user.getUsername());
    }
}

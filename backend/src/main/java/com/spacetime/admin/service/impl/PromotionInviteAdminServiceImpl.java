package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionInvitePageReq;
import com.spacetime.admin.dto.response.PromotionInviteRelationVO;
import com.spacetime.admin.service.PromotionInviteAdminService;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.PromotionRelationStatusEnum;
import com.spacetime.common.enums.PromotionRewardStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 邀请关系后台服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionInviteAdminServiceImpl implements PromotionInviteAdminService {
    private final PromotionInviteRelationDao relationDao;
    private final UserDao userDao;
    private final PromotionAgentDao agentDao;
    private final PromotionRewardLogDao rewardLogDao;
    private final PromotionAuditLogDao auditLogDao;

    @Override
    public Page<PromotionInviteRelationVO> list(PromotionInvitePageReq req) {
        java.util.List<Long> inviterIds = findUserIds(req.getInviterKeyword());
        java.util.List<Long> inviteeIds = findUserIds(req.getInviteeKeyword());
        if (StrUtil.isNotBlank(req.getInviterKeyword()) && inviterIds.isEmpty()
                || StrUtil.isNotBlank(req.getInviteeKeyword()) && inviteeIds.isEmpty()) {
            return new Page<>(req.getPage(), req.getSize(), 0);
        }
        LambdaQueryWrapper<PromotionInviteRelation> wrapper = new LambdaQueryWrapper<PromotionInviteRelation>()
                .eq(req.getInviterId() != null, PromotionInviteRelation::getInviterId, req.getInviterId())
                .in(!inviterIds.isEmpty(), PromotionInviteRelation::getInviterId, inviterIds)
                .eq(req.getInviteeId() != null, PromotionInviteRelation::getInviteeId, req.getInviteeId())
                .in(!inviteeIds.isEmpty(), PromotionInviteRelation::getInviteeId, inviteeIds)
                .eq(StrUtil.isNotBlank(req.getSourceType()), PromotionInviteRelation::getSourceType, req.getSourceType())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionInviteRelation::getStatus, req.getStatus())
                .orderByDesc(PromotionInviteRelation::getBindTime);
        Page<PromotionInviteRelation> page = relationDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionInviteRelationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
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

    private String userDisplayName(Long userId) {
        if (userId == null) {
            return null;
        }
        SysUser user = userDao.selectById(userId);
        if (user == null) {
            return null;
        }
        return StrUtil.blankToDefault(user.getNickname(), user.getUsername());
    }

    private String agentDisplayName(Long agentId) {
        if (agentId == null) {
            return null;
        }
        PromotionAgent agent = agentDao.selectById(agentId);
        if (agent == null) {
            return null;
        }
        return agent.getAgentName();
    }

    @Override
    public PromotionInviteRelationVO detail(Long id) {
        return toVO(requireRelation(id));
    }

    @Override
    @Transactional
    public void unfreeze(Long id, String remark) {
        PromotionInviteRelation relation = requireRelation(id);
        if (!PromotionRelationStatusEnum.FROZEN.getCode().equals(relation.getStatus())) {
            throw new BusinessException("只有冻结中的邀请关系可以解除冻结");
        }
        String beforeStatus = relation.getStatus();
        String restoredStatus = StrUtil.blankToDefault(relation.getFrozenBeforeStatus(), PromotionRelationStatusEnum.REGISTERED.getCode());
        relation.setStatus(restoredStatus);
        relationDao.updateById(relation);
        updateFrozenRewards(id, PromotionRewardStatusEnum.PENDING.getCode(), remark);
        audit("invite_relation", id, "unfreeze", beforeStatus, restoredStatus);
    }

    @Override
    @Transactional
    public void markInvalid(Long id, String remark) {
        PromotionInviteRelation relation = requireRelation(id);
        if (PromotionRelationStatusEnum.INVALID.getCode().equals(relation.getStatus())) {
            return;
        }
        String before = relation.getStatus();
        relation.setStatus(PromotionRelationStatusEnum.INVALID.getCode());
        relation.setInvalidReason(remark);
        relationDao.updateById(relation);
        updateRelationRewards(id, PromotionRewardStatusEnum.INVALID.getCode(), remark);
        audit("invite_relation", id, "invalid", before, remark);
    }

    private PromotionInviteRelation requireRelation(Long id) {
        PromotionInviteRelation relation = relationDao.selectById(id);
        if (relation == null) {
            throw new BusinessException("邀请关系不存在");
        }
        return relation;
    }

    private PromotionInviteRelationVO toVO(PromotionInviteRelation entity) {
        PromotionInviteRelationVO vo = new PromotionInviteRelationVO();
        vo.setId(entity.getId());
        vo.setRelationNo(entity.getRelationNo());
        vo.setSourceType(entity.getSourceType());
        vo.setInviterId(entity.getInviterId());
        vo.setInviterName(userDisplayName(entity.getInviterId()));
        vo.setInviteeId(entity.getInviteeId());
        vo.setInviteeName(userDisplayName(entity.getInviteeId()));
        vo.setAgentId(entity.getAgentId());
        vo.setAgentName(agentDisplayName(entity.getAgentId()));
        vo.setQrCode(entity.getQrCode());
        vo.setStatus(entity.getStatus());
        vo.setFrozenBeforeStatus(entity.getFrozenBeforeStatus());
        vo.setInvalidReason(entity.getInvalidReason());
        vo.setBindTime(entity.getBindTime());
        vo.setFirstLoginTime(entity.getFirstLoginTime());
        vo.setProfileCompleteTime(entity.getProfileCompleteTime());
        vo.setVerifySuccessTime(entity.getVerifySuccessTime());
        vo.setSuccessMetricHitTime(entity.getSuccessMetricHitTime());
        vo.setTotalRewardCoin(entity.getTotalRewardCoin());
        return vo;
    }

    private void updateFrozenRewards(Long relationId, String status, String remark) {
        Page<PromotionRewardLog> page = rewardLogDao.selectPage(new Page<>(1, 500, false),
                new LambdaQueryWrapper<PromotionRewardLog>()
                        .eq(PromotionRewardLog::getRelationId, relationId)
                        .eq(PromotionRewardLog::getStatus, PromotionRewardStatusEnum.FROZEN.getCode()));
        for (PromotionRewardLog reward : page.getRecords()) {
            reward.setStatus(status);
            reward.setReviewRemark(remark);
            rewardLogDao.updateById(reward);
        }
    }

    private void updateRelationRewards(Long relationId, String status, String remark) {
        Page<PromotionRewardLog> page = rewardLogDao.selectPage(new Page<>(1, 500, false),
                new LambdaQueryWrapper<PromotionRewardLog>().eq(PromotionRewardLog::getRelationId, relationId));
        for (PromotionRewardLog reward : page.getRecords()) {
            reward.setStatus(status);
            reward.setReviewRemark(remark);
            rewardLogDao.updateById(reward);
        }
    }

    private void audit(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        PromotionAuditLog log = new PromotionAuditLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        auditLogDao.insert(log);
    }
}

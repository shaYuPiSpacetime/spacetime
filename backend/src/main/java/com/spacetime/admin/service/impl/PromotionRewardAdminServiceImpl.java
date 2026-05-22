package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionRewardPageReq;
import com.spacetime.admin.dto.response.PromotionRewardLogVO;
import com.spacetime.admin.service.PromotionRewardAdminService;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.entity.PromotionRewardLog;
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

    @Override
    public Page<PromotionRewardLogVO> list(PromotionRewardPageReq req) {
        LambdaQueryWrapper<PromotionRewardLog> wrapper = new LambdaQueryWrapper<PromotionRewardLog>()
                .eq(req.getInviterId() != null, PromotionRewardLog::getInviterId, req.getInviterId())
                .eq(req.getInviteeId() != null, PromotionRewardLog::getInviteeId, req.getInviteeId())
                .eq(StrUtil.isNotBlank(req.getEventType()), PromotionRewardLog::getEventType, req.getEventType())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionRewardLog::getStatus, req.getStatus())
                .orderByDesc(PromotionRewardLog::getCreateTime);
        Page<PromotionRewardLog> page = rewardLogDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionRewardLogVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
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
        vo.setInviteeId(entity.getInviteeId());
        vo.setEventType(entity.getEventType());
        vo.setRewardCoin(entity.getRewardCoin());
        vo.setStatus(entity.getStatus());
        vo.setRiskReason(entity.getRiskReason());
        vo.setArriveTime(entity.getArriveTime());
        vo.setReviewTime(entity.getReviewTime());
        vo.setReviewRemark(entity.getReviewRemark());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }
}

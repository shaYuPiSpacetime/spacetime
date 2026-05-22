package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionInvitePageReq;
import com.spacetime.admin.dto.response.PromotionInviteRelationVO;
import com.spacetime.admin.service.PromotionInviteAdminService;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.enums.PromotionRelationStatusEnum;
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
    private final PromotionAuditLogDao auditLogDao;

    @Override
    public Page<PromotionInviteRelationVO> list(PromotionInvitePageReq req) {
        LambdaQueryWrapper<PromotionInviteRelation> wrapper = new LambdaQueryWrapper<PromotionInviteRelation>()
                .eq(req.getInviterId() != null, PromotionInviteRelation::getInviterId, req.getInviterId())
                .eq(req.getInviteeId() != null, PromotionInviteRelation::getInviteeId, req.getInviteeId())
                .eq(StrUtil.isNotBlank(req.getSourceType()), PromotionInviteRelation::getSourceType, req.getSourceType())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionInviteRelation::getStatus, req.getStatus())
                .orderByDesc(PromotionInviteRelation::getBindTime);
        Page<PromotionInviteRelation> page = relationDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionInviteRelationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public PromotionInviteRelationVO detail(Long id) {
        return toVO(requireRelation(id));
    }

    private PromotionInviteRelation requireRelation(Long id) {
        PromotionInviteRelation relation = relationDao.selectById(id);
        if (relation == null) {
            throw new BusinessException("邀请关系不存在");
        }
        return relation;
    }

    @Override
    @Transactional
    public void markInvalid(Long id, String remark) {
        PromotionInviteRelation relation = requireRelation(id);
        String before = relation.getStatus();
        relation.setStatus(PromotionRelationStatusEnum.INVALID.getCode());
        relation.setInvalidReason(remark);
        relationDao.updateById(relation);
        audit("invite", id, "invalid", before, remark);
    }

    @Override
    @Transactional
    public void unfreeze(Long id, String remark) {
        PromotionInviteRelation relation = requireRelation(id);
        String before = relation.getStatus();
        relation.setStatus(PromotionRelationStatusEnum.LOGIN_SUCCESS.getCode());
        relation.setFrozenReason(null);
        relationDao.updateById(relation);
        audit("invite", id, "unfreeze", before, remark);
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

    private PromotionInviteRelationVO toVO(PromotionInviteRelation entity) {
        PromotionInviteRelationVO vo = new PromotionInviteRelationVO();
        vo.setId(entity.getId());
        vo.setRelationNo(entity.getRelationNo());
        vo.setSourceType(entity.getSourceType());
        vo.setInviterId(entity.getInviterId());
        vo.setInviteeId(entity.getInviteeId());
        vo.setAgentId(entity.getAgentId());
        vo.setAgentCode(entity.getAgentCode());
        vo.setStatus(entity.getStatus());
        vo.setBindTime(entity.getBindTime());
        vo.setFirstLoginTime(entity.getFirstLoginTime());
        vo.setProfileCompleteTime(entity.getProfileCompleteTime());
        vo.setVerifySuccessTime(entity.getVerifySuccessTime());
        vo.setInvalidReason(entity.getInvalidReason());
        vo.setFrozenReason(entity.getFrozenReason());
        vo.setTotalRewardCoin(entity.getTotalRewardCoin());
        return vo;
    }
}

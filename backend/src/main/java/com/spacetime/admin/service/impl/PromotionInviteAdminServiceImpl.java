package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionInvitePageReq;
import com.spacetime.admin.dto.response.PromotionInviteRelationVO;
import com.spacetime.admin.service.PromotionInviteAdminService;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 邀请关系后台服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionInviteAdminServiceImpl implements PromotionInviteAdminService {
    private final PromotionInviteRelationDao relationDao;
    private final UserDao userDao;
    private final PromotionAgentDao agentDao;

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
        vo.setBindTime(entity.getBindTime());
        vo.setFirstLoginTime(entity.getFirstLoginTime());
        vo.setProfileCompleteTime(entity.getProfileCompleteTime());
        vo.setVerifySuccessTime(entity.getVerifySuccessTime());
        vo.setTotalRewardCoin(entity.getTotalRewardCoin());
        return vo;
    }
}

package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentQrCodeDao;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionSourceTraceDao;
import com.spacetime.common.entity.PromotionAgentQrCode;
import com.spacetime.common.entity.PromotionAgentEvent;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.enums.PromotionRelationStatusEnum;
import com.spacetime.common.enums.PromotionSourceTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionAgentStatService;
import com.spacetime.miniapp.dto.response.InviteBindVO;
import com.spacetime.miniapp.dto.response.InviteHomeVO;
import com.spacetime.miniapp.dto.response.InviteQrCodeVO;
import com.spacetime.miniapp.dto.response.InviteQrSourceVO;
import com.spacetime.miniapp.dto.response.InviteRecordVO;
import com.spacetime.miniapp.dto.response.InviteRulesVO;
import com.spacetime.miniapp.dto.response.InviteSourceTraceVO;
import com.spacetime.miniapp.service.PromotionInviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;

/**
 * 小程序邀请推广服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionInviteServiceImpl implements PromotionInviteService {
    private final PromotionSourceTraceDao sourceTraceDao;
    private final PromotionInviteRelationDao relationDao;
    private final PromotionAgentQrCodeDao qrCodeDao;
    private final PromotionAgentEventDao agentEventDao;
    private final PromotionAgentStatService agentStatService;

    @Override
    public InviteHomeVO home(Long userId) {
        InviteHomeVO vo = new InviteHomeVO();
        vo.setSuccessInviteCount(0);
        vo.setArrivedCoin(BigDecimal.ZERO);
        vo.setNextLadderText(null);
        vo.setCoinUsage("可在会员、解锁等场景抵扣使用");
        vo.setQrCode(qrCode(userId));
        vo.setMiniPath(vo.getQrCode().getMiniappPath());
        vo.setRecentRecords(List.of());
        return vo;
    }

    @Override
    public InviteRulesVO rules() {
        InviteRulesVO vo = new InviteRulesVO();
        vo.setSuccessRule("被邀请人完成资料完善和认证后，按后台配置口径计入成功邀请");
        vo.setRewardRule("注册登录、资料完善、认证完成、首次会员、首次充值成家币可按后台配置触发奖励");
        vo.setRiskRule("作弊、刷量、自邀不计奖，异常奖励可能进入冻结复核");
        vo.setFallbackText("邀请好友注册并完成指定任务后，可获得成家币奖励。具体奖励以活动页展示为准。");
        return vo;
    }

    @Override
    public Page<InviteRecordVO> records(Long userId, int page, int size, String status) {
        LambdaQueryWrapper<PromotionInviteRelation> wrapper = new LambdaQueryWrapper<PromotionInviteRelation>()
                .eq(PromotionInviteRelation::getInviterId, userId)
                .eq(StrUtil.isNotBlank(status), PromotionInviteRelation::getStatus, status)
                .orderByDesc(PromotionInviteRelation::getBindTime);
        Page<PromotionInviteRelation> source = relationDao.selectPage(new Page<>(page, Math.min(size, 100)), wrapper);
        Page<InviteRecordVO> result = new Page<>(source.getCurrent(), source.getSize(), source.getTotal());
        result.setRecords(source.getRecords().stream().map(this::toRecordVO).toList());
        return result;
    }

    @Override
    @Transactional
    public InviteSourceTraceVO shareLog(PromotionSourceTrace trace) {
        if (StrUtil.isBlank(trace.getSourceType())) {
            throw new BusinessException("来源类型不能为空");
        }
        trace.setSourceType(PromotionSourceTypeEnum.normalize(trace.getSourceType()));
        trace.setTraceNo(StrUtil.blankToDefault(trace.getTraceNo(), "TR" + IdUtil.getSnowflakeNextIdStr()));
        trace.setBindStatus("unbound");
        sourceTraceDao.insert(trace);
        if (PromotionSourceTypeEnum.isCampusAgent(trace.getSourceType()) && StrUtil.isNotBlank(trace.getQrCode())) {
            PromotionAgentQrCode code = qrCodeDao.selectByQrCode(trace.getQrCode());
            if (code != null) {
                PromotionAgentEvent event = new PromotionAgentEvent();
                event.setAgentId(code.getAgentId());
                event.setQrCode(code.getQrCode());
                event.setEventType("click");
                event.setEventTime(LocalDateTime.now());
                event.setBonusGenerated(0);
                agentEventDao.insert(event);
                agentStatService.safeRefreshByEvent(code.getAgentId());
            }
        }
        return toTraceVO(trace);
    }

    @Override
    @Transactional
    public InviteBindVO bind(Long userId, String traceNo, String inviteCode, String qrCode) {
        if (userId == null) {
            throw new BusinessException("登录用户不能为空");
        }
        PromotionInviteRelation exist = relationDao.selectByInviteeId(userId);
        if (exist != null) {
            return toBindVO(exist);
        }
        PromotionSourceTrace trace = StrUtil.isBlank(traceNo) ? null : sourceTraceDao.selectByTraceNo(traceNo);
        PromotionAgentQrCode agent = null;
        if (StrUtil.isNotBlank(qrCode)) {
            agent = qrCodeDao.selectByQrCode(qrCode);
        }
        if (agent == null && trace != null && StrUtil.isNotBlank(trace.getQrCode())) {
            agent = qrCodeDao.selectByQrCode(trace.getQrCode());
        }

        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setRelationNo("IR" + IdUtil.getSnowflakeNextIdStr());
        relation.setSourceTraceId(trace == null ? null : trace.getId());
        relation.setInviteeId(userId);
        relation.setStatus(PromotionRelationStatusEnum.REGISTERED.getCode());
        relation.setBindTime(LocalDateTime.now());
        relation.setRegisterTime(LocalDateTime.now());
        relation.setFirstLoginTime(LocalDateTime.now());

        if (agent != null) {
            relation.setSourceType(PromotionSourceTypeEnum.CAMPUS_AGENT.getCode());
            relation.setAgentId(agent.getAgentId());
            relation.setQrCode(agent.getQrCode());
        } else if (trace != null) {
            if (trace.getInviterId() != null && trace.getInviterId().equals(userId)) {
                throw new BusinessException("不能邀请自己");
            }
            relation.setSourceType(PromotionSourceTypeEnum.NORMAL_USER.getCode());
            relation.setInviterId(trace.getInviterId());
        } else if (StrUtil.isNotBlank(inviteCode)) {
            relation.setSourceType(PromotionSourceTypeEnum.NORMAL_USER.getCode());
        } else {
            throw new BusinessException("邀请来源不能为空");
        }

        relationDao.insert(relation);
        recordAgentEventIfNeeded(relation, PromotionRelationStatusEnum.REGISTERED.getCode());
        if (trace != null) {
            trace.setInviteeUserId(userId);
            trace.setBindStatus("bound");
            sourceTraceDao.updateById(trace);
        }
        return toBindVO(relation);
    }

    @Override
    @Transactional
    public PromotionInviteRelation markProfileCompleted(Long inviteeId) {
        PromotionInviteRelation relation = requireRelationByInvitee(inviteeId);
        if (PromotionRelationStatusEnum.PROFILE_COMPLETED.getCode().equals(relation.getStatus())
                || PromotionRelationStatusEnum.VERIFY_SUCCESS.getCode().equals(relation.getStatus())) {
            return relation;
        }
        relation.setStatus(PromotionRelationStatusEnum.PROFILE_COMPLETED.getCode());
        if (relation.getProfileCompleteTime() == null) {
            relation.setProfileCompleteTime(LocalDateTime.now());
        }
        relationDao.updateById(relation);
        recordAgentEventIfNeeded(relation, PromotionRelationStatusEnum.PROFILE_COMPLETED.getCode());
        return relation;
    }

    @Override
    @Transactional
    public PromotionInviteRelation markVerifySuccess(Long inviteeId) {
        PromotionInviteRelation relation = requireRelationByInvitee(inviteeId);
        if (PromotionRelationStatusEnum.VERIFY_SUCCESS.getCode().equals(relation.getStatus())) {
            return relation;
        }
        relation.setStatus(PromotionRelationStatusEnum.VERIFY_SUCCESS.getCode());
        if (relation.getProfileCompleteTime() == null) {
            relation.setProfileCompleteTime(LocalDateTime.now());
        }
        if (relation.getVerifySuccessTime() == null) {
            relation.setVerifySuccessTime(LocalDateTime.now());
        }
        relationDao.updateById(relation);
        recordAgentEventIfNeeded(relation, PromotionRelationStatusEnum.VERIFY_SUCCESS.getCode());
        return relation;
    }

    private PromotionInviteRelation requireRelationByInvitee(Long inviteeId) {
        if (inviteeId == null) {
            throw new BusinessException("被邀请用户不能为空");
        }
        PromotionInviteRelation relation = relationDao.selectByInviteeId(inviteeId);
        if (relation == null) {
            throw new BusinessException("邀请关系不存在");
        }
        return relation;
    }

    private void recordAgentEventIfNeeded(PromotionInviteRelation relation, String eventType) {
        if (!PromotionSourceTypeEnum.isCampusAgent(relation.getSourceType()) || relation.getAgentId() == null) {
            return;
        }
        PromotionAgentEvent event = new PromotionAgentEvent();
        event.setAgentId(relation.getAgentId());
        event.setQrCode(relation.getQrCode());
        event.setRelationId(relation.getId());
        event.setUserId(relation.getInviteeId());
        event.setEventType(eventType);
        event.setEventTime(LocalDateTime.now());
        event.setBonusGenerated(0);
        agentEventDao.insert(event);
        agentStatService.safeRefreshByEvent(relation.getAgentId());
    }

    @Override
    public InviteQrCodeVO qrCode(Long userId) {
        InviteQrCodeVO vo = new InviteQrCodeVO();
        vo.setMaterialUrl(null);
        vo.setQrUrl(null);
        vo.setMiniappPath("/pages/index/index?inviterId=" + userId);
        return vo;
    }

    @Override
    public InviteQrSourceVO qrSource(String qrCode) {
        PromotionAgentQrCode code = qrCodeDao.selectByQrCode(qrCode);
        InviteQrSourceVO vo = new InviteQrSourceVO();
        vo.setAvailable(code != null);
        vo.setQrCode(qrCode);
        vo.setMiniappPath(code == null ? null : code.getMiniappPath());
        return vo;
    }

    private InviteRecordVO toRecordVO(PromotionInviteRelation relation) {
        InviteRecordVO vo = new InviteRecordVO();
        vo.setRelationNo(relation.getRelationNo());
        vo.setInviteeDisplay(relation.getInviteeId() == null ? null : "用户" + relation.getInviteeId());
        vo.setRelationStatus(relation.getStatus());
        vo.setRelationStatusName(statusName(relation.getStatus()));
        vo.setRewardCoin(relation.getTotalRewardCoin() == null ? BigDecimal.ZERO : relation.getTotalRewardCoin());
        vo.setBindTime(relation.getBindTime());
        vo.setInvalidReasonText(null);
        return vo;
    }

    private InviteSourceTraceVO toTraceVO(PromotionSourceTrace trace) {
        InviteSourceTraceVO vo = new InviteSourceTraceVO();
        vo.setId(trace.getId());
        vo.setTraceNo(trace.getTraceNo());
        vo.setSourceType(trace.getSourceType());
        vo.setBindStatus(trace.getBindStatus());
        return vo;
    }

    private InviteBindVO toBindVO(PromotionInviteRelation relation) {
        InviteBindVO vo = new InviteBindVO();
        vo.setRelationId(relation.getId());
        vo.setRelationNo(relation.getRelationNo());
        vo.setSourceType(relation.getSourceType());
        vo.setStatus(relation.getStatus());
        return vo;
    }

    private String statusName(String status) {
        if (PromotionRelationStatusEnum.REGISTERED.getCode().equals(status)) {
            return "已注册";
        }
        if (PromotionRelationStatusEnum.PROFILE_COMPLETED.getCode().equals(status)) {
            return "已完善资料";
        }
        if (PromotionRelationStatusEnum.VERIFY_SUCCESS.getCode().equals(status)) {
            return "已认证";
        }
        if (PromotionRelationStatusEnum.FROZEN.getCode().equals(status)) {
            return "冻结中";
        }
        if (PromotionRelationStatusEnum.INVALID.getCode().equals(status)) {
            return "已无效";
        }
        return status;
    }
}

package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentCodeDao;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionSourceTraceDao;
import com.spacetime.common.entity.PromotionAgentCode;
import com.spacetime.common.entity.PromotionAgentEvent;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.enums.PromotionRelationStatusEnum;
import com.spacetime.common.enums.PromotionSourceTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.PromotionInviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 小程序邀请推广服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionInviteServiceImpl implements PromotionInviteService {
    private final PromotionSourceTraceDao sourceTraceDao;
    private final PromotionInviteRelationDao relationDao;
    private final PromotionAgentCodeDao agentCodeDao;
    private final PromotionAgentEventDao agentEventDao;

    @Override
    public Map<String, Object> home(Long userId) {
        Map<String, Object> result = new HashMap<>();
        result.put("successInviteCount", 0);
        result.put("totalRewardCoin", 0);
        result.put("nextTierText", "邀请 2 位新同学完成三项认证，即可获得更多成家币");
        return result;
    }

    @Override
    public Map<String, Object> rules() {
        Map<String, Object> result = new HashMap<>();
        result.put("successRule", "被邀请人完成实名认证、头像认证、学历认证后，才算成功邀请");
        result.put("rewardRule", "注册登录、资料完成、三项认证完成可分别触发奖励");
        result.put("riskRule", "作弊、刷量、自邀不计奖，异常奖励可能进入冻结复核");
        return result;
    }

    @Override
    public Page<PromotionInviteRelation> records(Long userId, int page, int size, String status) {
        LambdaQueryWrapper<PromotionInviteRelation> wrapper = new LambdaQueryWrapper<PromotionInviteRelation>()
                .eq(PromotionInviteRelation::getInviterId, userId)
                .eq(StrUtil.isNotBlank(status), PromotionInviteRelation::getStatus, status)
                .orderByDesc(PromotionInviteRelation::getBindTime);
        return relationDao.selectPage(new Page<>(page, Math.min(size, 100)), wrapper);
    }

    @Override
    @Transactional
    public PromotionSourceTrace shareLog(PromotionSourceTrace trace) {
        if (StrUtil.isBlank(trace.getSourceType())) {
            throw new BusinessException("来源类型不能为空");
        }
        trace.setTraceNo(StrUtil.blankToDefault(trace.getTraceNo(), "TR" + IdUtil.getSnowflakeNextIdStr()));
        trace.setBindStatus("unbound");
        sourceTraceDao.insert(trace);
        if (PromotionSourceTypeEnum.AGENT_CODE.getCode().equals(trace.getSourceType()) && StrUtil.isNotBlank(trace.getAgentCode())) {
            PromotionAgentCode code = agentCodeDao.selectByAgentCode(trace.getAgentCode());
            if (code != null && "enabled".equals(code.getStatus())) {
                PromotionAgentEvent event = new PromotionAgentEvent();
                event.setAgentId(code.getAgentId());
                event.setAgentCode(code.getAgentCode());
                event.setEventType("click");
                event.setEventTime(LocalDateTime.now());
                event.setBonusGenerated(0);
                agentEventDao.insert(event);
            }
        }
        return trace;
    }

    @Override
    @Transactional
    public PromotionInviteRelation bind(Long userId, String traceNo, String inviteCode, String agentCode) {
        if (userId == null) {
            throw new BusinessException("登录用户不能为空");
        }
        PromotionInviteRelation exist = relationDao.selectByInviteeId(userId);
        if (exist != null) {
            return exist;
        }
        PromotionSourceTrace trace = StrUtil.isBlank(traceNo) ? null : sourceTraceDao.selectByTraceNo(traceNo);
        PromotionAgentCode agent = null;
        if (StrUtil.isNotBlank(agentCode)) {
            agent = agentCodeDao.selectByAgentCode(agentCode);
        }
        if (agent != null && !"enabled".equals(agent.getStatus())) {
            agent = null;
        }
        if (agent == null && trace != null && StrUtil.isNotBlank(trace.getAgentCode())) {
            agent = agentCodeDao.selectByAgentCode(trace.getAgentCode());
            if (agent != null && !"enabled".equals(agent.getStatus())) {
                agent = null;
            }
        }

        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setRelationNo("IR" + IdUtil.getSnowflakeNextIdStr());
        relation.setSourceTraceId(trace == null ? null : trace.getId());
        relation.setInviteeId(userId);
        relation.setStatus(PromotionRelationStatusEnum.LOGIN_SUCCESS.getCode());
        relation.setBindTime(LocalDateTime.now());
        relation.setFirstLoginTime(LocalDateTime.now());

        if (agent != null) {
            relation.setSourceType(PromotionSourceTypeEnum.AGENT_CODE.getCode());
            relation.setAgentId(agent.getAgentId());
            relation.setAgentCode(agent.getAgentCode());
        } else if (trace != null) {
            if (trace.getInviterId() != null && trace.getInviterId().equals(userId)) {
                throw new BusinessException("不能邀请自己");
            }
            relation.setSourceType(trace.getSourceType());
            relation.setInviterId(trace.getInviterId());
        } else if (StrUtil.isNotBlank(inviteCode)) {
            relation.setSourceType(PromotionSourceTypeEnum.INVITE_CODE.getCode());
        } else {
            throw new BusinessException("邀请来源不能为空");
        }

        relationDao.insert(relation);
        if (trace != null) {
            trace.setInviteeUserId(userId);
            trace.setBindStatus("bound");
            sourceTraceDao.updateById(trace);
        }
        return relation;
    }

    @Override
    public Map<String, Object> poster(Long userId) {
        Map<String, Object> result = new HashMap<>();
        result.put("posterUrl", null);
        result.put("qrUrl", null);
        result.put("miniappPath", "/pages/index/index?inviterId=" + userId);
        return result;
    }

    @Override
    public Map<String, Object> agentSource(String agentCode) {
        PromotionAgentCode code = agentCodeDao.selectByAgentCode(agentCode);
        Map<String, Object> result = new HashMap<>();
        result.put("available", code != null && "enabled".equals(code.getStatus()));
        result.put("agentCode", agentCode);
        result.put("miniappPath", code == null ? null : code.getMiniappPath());
        return result;
    }
}

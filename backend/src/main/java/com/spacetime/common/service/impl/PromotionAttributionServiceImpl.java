package com.spacetime.common.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.crypto.digest.DigestUtil;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentQrCodeDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionAgentStatDao;
import com.spacetime.common.dao.PromotionSourceTraceDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentQrCode;
import com.spacetime.common.entity.PromotionInviteRelation;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.enums.PromotionAgentStatusEnum;
import com.spacetime.common.enums.PromotionSourceTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionAttributionService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * 推广来源记录与注册归因服务实现。
 */
@Service
@RequiredArgsConstructor
public class PromotionAttributionServiceImpl implements PromotionAttributionService {
    private final PromotionSourceTraceDao traceDao;
    private final PromotionInviteRelationDao relationDao;
    private final PromotionAgentDao agentDao;
    private final PromotionAgentQrCodeDao qrCodeDao;
    private final PromotionAgentStatDao agentStatDao;

    @Override
    public PromotionSourceTrace createNormalTrace(Long inviterId) {
        if (inviterId == null) {
            throw new BusinessException(70001, "推广来源无效");
        }
        PromotionSourceTrace trace = newTrace(PromotionSourceTypeEnum.NORMAL_USER.getCode());
        trace.setInviterId(inviterId);
        traceDao.insert(trace);
        return trace;
    }

    @Override
    @Transactional
    public PromotionSourceTrace createAnonymousTrace(String sourceType,
                                                     String sourceToken,
                                                     String visitorKey) {
        if (!PromotionSourceTypeEnum.supports(sourceType)
                || sourceToken == null || sourceToken.isBlank()) {
            throw new BusinessException(70001, "推广来源无效");
        }
        Long inviterId = null;
        Long agentId = null;
        String qrToken = null;
        if (PromotionSourceTypeEnum.isNormalUser(sourceType)) {
            PromotionSourceTrace source = traceDao.selectByTraceNo(sourceToken);
            if (source == null || !PromotionSourceTypeEnum.isNormalUser(source.getSourceType())
                    || source.getInviterId() == null) {
                throw new BusinessException(70001, "推广来源无效");
            }
            inviterId = source.getInviterId();
        } else {
            PromotionAgentQrCode qrCode = qrCodeDao.selectByQrToken(sourceToken);
            if (qrCode == null) {
                throw new BusinessException(70001, "推广来源无效");
            }
            agentId = qrCode.getAgentId();
            qrToken = qrCode.getQrToken();
        }
        String objectKey = inviterId != null ? String.valueOf(inviterId) : String.valueOf(agentId);
        String requestKey = visitorKey == null || visitorKey.isBlank()
                ? null
                : DigestUtil.sha256Hex(sourceType + ":" + objectKey + ":" + visitorKey);
        if (requestKey != null) {
            PromotionSourceTrace existing = traceDao.selectByRequestKey(requestKey);
            if (existing != null) {
                return existing;
            }
        }
        PromotionSourceTrace trace = newTrace(sourceType);
        trace.setInviterId(inviterId);
        trace.setAgentId(agentId);
        trace.setQrToken(qrToken);
        trace.setRequestKey(requestKey);
        try {
            traceDao.insert(trace);
        } catch (DuplicateKeyException ex) {
            PromotionSourceTrace winner = requestKey == null ? null : traceDao.selectByRequestKey(requestKey);
            if (winner != null) {
                return winner;
            }
            throw ex;
        }
        if (agentId != null) {
            incrementAgentClick(agentId);
        }
        return trace;
    }

    @Override
    @Transactional
    public PromotionInviteRelation bindNewUser(Long inviteeId,
                                               LocalDateTime registeredAt,
                                               List<String> traceNos,
                                               boolean newlyRegistered) {
        PromotionInviteRelation existing = relationDao.selectByInviteeId(inviteeId);
        if (existing != null) {
            return existing;
        }
        if (!newlyRegistered) {
            return null;
        }
        List<PromotionSourceTrace> traces = traceNos == null ? List.of() : traceNos.stream()
                .filter(Objects::nonNull)
                .map(traceDao::selectByTraceNo)
                .filter(Objects::nonNull)
                .toList();
        PromotionSourceTrace selected = traces.stream()
                .filter(item -> PromotionSourceTypeEnum.isCampusAgent(item.getSourceType()))
                .filter(this::isEnabledAgent)
                .max(Comparator.comparing(PromotionSourceTrace::getTracedAt))
                .orElseGet(() -> traces.stream()
                        .filter(item -> PromotionSourceTypeEnum.isNormalUser(item.getSourceType()))
                        .max(Comparator.comparing(PromotionSourceTrace::getTracedAt))
                        .orElse(null));
        if (selected == null) {
            return null;
        }
        if (PromotionSourceTypeEnum.isNormalUser(selected.getSourceType())
                && inviteeId.equals(selected.getInviterId())) {
            return null;
        }
        PromotionInviteRelation relation = new PromotionInviteRelation();
        relation.setRelationNo("REL-" + IdUtil.getSnowflakeNextIdStr());
        relation.setSourceTraceId(selected.getId());
        relation.setSourceType(selected.getSourceType());
        relation.setInviterId(selected.getInviterId());
        relation.setAgentId(selected.getAgentId());
        relation.setInviteeId(inviteeId);
        relation.setRegisteredAt(registeredAt == null ? LocalDateTime.now() : registeredAt);
        try {
            relationDao.insert(relation);
            return relation;
        } catch (DuplicateKeyException ex) {
            PromotionInviteRelation winner = relationDao.selectByInviteeId(inviteeId);
            if (winner != null) {
                return winner;
            }
            throw ex;
        }
    }

    private PromotionSourceTrace newTrace(String sourceType) {
        PromotionSourceTrace trace = new PromotionSourceTrace();
        trace.setTraceNo("TRC-" + IdUtil.fastSimpleUUID());
        trace.setSourceType(sourceType);
        trace.setTracedAt(LocalDateTime.now());
        return trace;
    }

    private boolean isEnabledAgent(PromotionSourceTrace trace) {
        PromotionAgent agent = trace.getAgentId() == null ? null : agentDao.selectById(trace.getAgentId());
        return agent != null && PromotionAgentStatusEnum.ENABLED.getCode().equals(agent.getStatus());
    }

    private void incrementAgentClick(Long agentId) {
        if (agentStatDao.incrementScanClickCount(agentId) == 1) {
            return;
        }
        com.spacetime.common.entity.PromotionAgentStat stat =
                new com.spacetime.common.entity.PromotionAgentStat();
        PromotionAgent agent = agentDao.selectById(agentId);
        stat.setAgentId(agentId);
        stat.setAgentNo(agent == null ? null : agent.getAgentNo());
        stat.setClickCnt(1);
        stat.setSuccessInviteCount(0);
        stat.setTotalBonusAmount(java.math.BigDecimal.ZERO);
        stat.setPendingBonusAmount(java.math.BigDecimal.ZERO);
        stat.setConfirmedBonusAmount(java.math.BigDecimal.ZERO);
        stat.setStatVersion(1);
        try {
            agentStatDao.insert(stat);
        } catch (DuplicateKeyException ex) {
            agentStatDao.incrementScanClickCount(agentId);
        }
    }
}

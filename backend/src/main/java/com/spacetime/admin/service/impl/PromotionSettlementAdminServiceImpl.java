package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionSettlementPageReq;
import com.spacetime.admin.dto.response.PromotionSettlementVO;
import com.spacetime.admin.service.PromotionSettlementAdminService;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentSettlementDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentSettlement;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.enums.PromotionSettlementStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionAgentStatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 代理结算后台服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionSettlementAdminServiceImpl implements PromotionSettlementAdminService {
    private final PromotionAgentSettlementDao settlementDao;
    private final PromotionAuditLogDao auditLogDao;
    private final PromotionAgentDao agentDao;
    private final PromotionAgentStatService agentStatService;

    @Override
    public Page<PromotionSettlementVO> list(PromotionSettlementPageReq req) {
        java.util.List<Long> agentIds = findAgentIds(req.getAgentKeyword());
        if (StrUtil.isNotBlank(req.getAgentKeyword()) && agentIds.isEmpty()) {
            return new Page<>(req.getPage(), req.getSize(), 0);
        }
        LambdaQueryWrapper<PromotionAgentSettlement> wrapper = new LambdaQueryWrapper<PromotionAgentSettlement>()
                .like(StrUtil.isNotBlank(req.getSettlementNo()), PromotionAgentSettlement::getSettlementNo, req.getSettlementNo())
                .eq(req.getAgentId() != null, PromotionAgentSettlement::getAgentId, req.getAgentId())
                .in(!agentIds.isEmpty(), PromotionAgentSettlement::getAgentId, agentIds)
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionAgentSettlement::getStatus, req.getStatus())
                .ge(req.getPeriodStart() != null, PromotionAgentSettlement::getPeriodStart, req.getPeriodStart())
                .le(req.getPeriodEnd() != null, PromotionAgentSettlement::getPeriodEnd, req.getPeriodEnd())
                .orderByDesc(PromotionAgentSettlement::getCreateTime);
        Page<PromotionAgentSettlement> page = settlementDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionSettlementVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    private java.util.List<Long> findAgentIds(String keyword) {
        if (StrUtil.isBlank(keyword)) {
            return java.util.List.of();
        }
        LambdaQueryWrapper<PromotionAgent> wrapper = new LambdaQueryWrapper<PromotionAgent>()
                .like(PromotionAgent::getAgentNo, keyword)
                .or()
                .like(PromotionAgent::getAgentName, keyword)
                .or()
                .like(PromotionAgent::getContactName, keyword)
                .or()
                .like(PromotionAgent::getContactPhone, keyword);
        return agentDao.selectPage(new Page<>(1, 100), wrapper).getRecords().stream()
                .map(PromotionAgent::getId)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private String agentName(Long agentId) {
        if (agentId == null) {
            return null;
        }
        PromotionAgent agent = agentDao.selectById(agentId);
        return agent == null ? null : agent.getAgentName();
    }

    private PromotionAgent agent(Long agentId) {
        return agentId == null ? null : agentDao.selectById(agentId);
    }

    @Override
    @Transactional
    public void confirm(Long id, String remark) {
        PromotionAgentSettlement settlement = detail(id);
        if (!PromotionSettlementStatusEnum.isUnsettled(settlement.getStatus())) {
            throw new BusinessException("只有待确认结算单可以确认");
        }
        String before = settlement.getStatus();
        settlement.setStatus(PromotionSettlementStatusEnum.CONFIRMED.getCode());
        settlement.setConfirmTime(LocalDateTime.now());
        settlement.setRemark(remark);
        settlementDao.updateById(settlement);
        agentStatService.safeRefreshBySettlement(settlement.getAgentId());
        audit("settlement", id, "confirm", before, remark);
    }

    @Override
    @Transactional
    public void paid(Long id, BigDecimal paidAmount, String remark) {
        PromotionAgentSettlement settlement = detail(id);
        if (!PromotionSettlementStatusEnum.CONFIRMED.getCode().equals(settlement.getStatus())) {
            throw new BusinessException("只有已确认结算单可以标记发放");
        }
        settlement.setStatus(PromotionSettlementStatusEnum.PAID.getCode());
        settlement.setPaidAmount(paidAmount);
        settlement.setPaidTime(LocalDateTime.now());
        settlement.setRemark(remark);
        settlementDao.updateById(settlement);
        agentStatService.safeRefreshBySettlement(settlement.getAgentId());
        audit("settlement", id, "paid", PromotionSettlementStatusEnum.CONFIRMED.getCode(), remark);
    }

    private PromotionAgentSettlement detail(Long id) {
        PromotionAgentSettlement settlement = settlementDao.selectById(id);
        if (settlement == null) {
            throw new BusinessException("结算单不存在");
        }
        return settlement;
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

    private PromotionSettlementVO toVO(PromotionAgentSettlement entity) {
        PromotionSettlementVO vo = new PromotionSettlementVO();
        vo.setId(entity.getId());
        vo.setSettlementNo(entity.getSettlementNo());
        vo.setAgentId(entity.getAgentId());
        PromotionAgent agent = agent(entity.getAgentId());
        vo.setAgentNo(agent == null ? null : agent.getAgentNo());
        vo.setAgentName(agent == null ? null : agent.getAgentName());
        vo.setAgentDisplay(agent == null ? null : agent.getAgentNo() + " / " + agent.getAgentName());
        vo.setPeriodStart(entity.getPeriodStart());
        vo.setPeriodEnd(entity.getPeriodEnd());
        vo.setPeriodText(entity.getPeriodStart() + " 至 " + entity.getPeriodEnd());
        vo.setStatsDesc(entity.getStatsDesc());
        vo.setCaliberDesc(StrUtil.blankToDefault(entity.getStatsDesc(), "按正式版推广成功口径统计"));
        vo.setPayableAmount(entity.getPayableAmount());
        vo.setPaidAmount(entity.getPaidAmount());
        vo.setStatus(entity.getStatus());
        vo.setSettlementMethod("线下发放");
        vo.setPayeeInfo("以代理合同/备注为准");
        vo.setConfirmTime(entity.getConfirmTime());
        vo.setPaidTime(entity.getPaidTime());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }
}

package com.spacetime.admin.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionSettlementCreateReq;
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

    @Override
    public Page<PromotionSettlementVO> list(PromotionSettlementPageReq req) {
        java.util.List<Long> agentIds = findAgentIds(req.getAgentKeyword());
        if (StrUtil.isNotBlank(req.getAgentKeyword()) && agentIds.isEmpty()) {
            return new Page<>(req.getPage(), req.getSize(), 0);
        }
        LambdaQueryWrapper<PromotionAgentSettlement> wrapper = new LambdaQueryWrapper<PromotionAgentSettlement>()
                .eq(req.getAgentId() != null, PromotionAgentSettlement::getAgentId, req.getAgentId())
                .in(!agentIds.isEmpty(), PromotionAgentSettlement::getAgentId, agentIds)
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionAgentSettlement::getStatus, req.getStatus())
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

    @Override
    @Transactional
    public Long create(PromotionSettlementCreateReq req) {
        PromotionAgentSettlement settlement = new PromotionAgentSettlement();
        settlement.setAgentId(req.getAgentId());
        settlement.setPeriodStart(req.getPeriodStart());
        settlement.setPeriodEnd(req.getPeriodEnd());
        settlement.setStatsDesc(req.getStatsDesc());
        settlement.setPayableAmount(req.getPayableAmount());
        settlement.setRemark(req.getRemark());
        if (settlement.getPeriodStart().isAfter(settlement.getPeriodEnd())) {
            throw new BusinessException("结算开始日期不能晚于结束日期");
        }
        settlement.setSettlementNo("ST" + IdUtil.getSnowflakeNextIdStr());
        if (settlement.getPayableAmount() == null) {
            settlement.setPayableAmount(BigDecimal.ZERO);
        }
        if (settlement.getPaidAmount() == null) {
            settlement.setPaidAmount(BigDecimal.ZERO);
        }
        settlement.setStatus(PromotionSettlementStatusEnum.PENDING.getCode());
        settlementDao.insert(settlement);
        audit("settlement", settlement.getId(), "create", null, settlement.getSettlementNo());
        return settlement.getId();
    }

    @Override
    @Transactional
    public void confirm(Long id, String remark) {
        PromotionAgentSettlement settlement = detail(id);
        if (!PromotionSettlementStatusEnum.PENDING.getCode().equals(settlement.getStatus())) {
            throw new BusinessException("只有待确认结算单可以确认");
        }
        settlement.setStatus(PromotionSettlementStatusEnum.CONFIRMED.getCode());
        settlement.setConfirmTime(LocalDateTime.now());
        settlement.setRemark(remark);
        settlementDao.updateById(settlement);
        audit("settlement", id, "confirm", PromotionSettlementStatusEnum.PENDING.getCode(), remark);
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
        vo.setAgentName(agentName(entity.getAgentId()));
        vo.setPeriodStart(entity.getPeriodStart());
        vo.setPeriodEnd(entity.getPeriodEnd());
        vo.setStatsDesc(entity.getStatsDesc());
        vo.setPayableAmount(entity.getPayableAmount());
        vo.setPaidAmount(entity.getPaidAmount());
        vo.setStatus(entity.getStatus());
        vo.setConfirmTime(entity.getConfirmTime());
        vo.setPaidTime(entity.getPaidTime());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }
}

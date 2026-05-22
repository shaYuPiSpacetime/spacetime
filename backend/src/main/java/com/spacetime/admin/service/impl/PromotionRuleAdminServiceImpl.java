package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionRulePageReq;
import com.spacetime.admin.dto.request.PromotionRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionRuleTierReq;
import com.spacetime.admin.dto.response.PromotionRuleVO;
import com.spacetime.admin.service.PromotionRuleAdminService;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionRuleDao;
import com.spacetime.common.dao.PromotionRuleTierDao;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.entity.PromotionRule;
import com.spacetime.common.entity.PromotionRuleTier;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 推广规则后台服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionRuleAdminServiceImpl implements PromotionRuleAdminService {
    private final PromotionRuleDao ruleDao;
    private final PromotionRuleTierDao tierDao;
    private final PromotionAuditLogDao auditLogDao;

    @Override
    public Page<PromotionRuleVO> list(PromotionRulePageReq req) {
        LambdaQueryWrapper<PromotionRule> wrapper = new LambdaQueryWrapper<PromotionRule>()
                .eq(StrUtil.isNotBlank(req.getRuleType()), PromotionRule::getRuleType, req.getRuleType())
                .eq(StrUtil.isNotBlank(req.getEventType()), PromotionRule::getEventType, req.getEventType())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionRule::getStatus, req.getStatus())
                .orderByDesc(PromotionRule::getCreateTime);
        Page<PromotionRule> page = ruleDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionRuleVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public PromotionRuleVO detail(Long id) {
        return toVO(requireRule(id));
    }

    private PromotionRule requireRule(Long id) {
        PromotionRule rule = ruleDao.selectById(id);
        if (rule == null) {
            throw new BusinessException("推广规则不存在");
        }
        return rule;
    }

    @Override
    @Transactional
    public Long create(PromotionRuleSaveReq req) {
        validateRule(req);
        PromotionRule rule = toEntity(req);
        if (StrUtil.isBlank(rule.getStatus())) {
            rule.setStatus(CommonStatusEnum.ENABLED.getCode());
        }
        ruleDao.insert(rule);
        audit("rule", rule.getId(), "create", null, rule.getRuleName());
        return rule.getId();
    }

    @Override
    @Transactional
    public void update(Long id, PromotionRuleSaveReq req) {
        validateRule(req);
        PromotionRule entity = requireRule(id);
        PromotionRule changed = toEntity(req);
        entity.setRuleName(changed.getRuleName());
        entity.setRuleType(changed.getRuleType());
        entity.setEventType(changed.getEventType());
        entity.setRewardAmount(changed.getRewardAmount());
        entity.setRewardUnit(changed.getRewardUnit());
        entity.setDailyLimit(changed.getDailyLimit());
        entity.setEffectiveTime(changed.getEffectiveTime());
        entity.setExpireTime(changed.getExpireTime());
        entity.setAgentGroup(changed.getAgentGroup());
        entity.setStatus(changed.getStatus());
        entity.setRemark(changed.getRemark());
        ruleDao.updateById(entity);
        audit("rule", id, "update", null, entity.getRuleName());
    }

    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        PromotionRule entity = requireRule(id);
        String before = entity.getStatus();
        entity.setStatus(status);
        ruleDao.updateById(entity);
        audit("rule", id, "status", before, status);
    }

    @Override
    @Transactional
    public void saveTiers(Long ruleId, List<PromotionRuleTierReq> tiers) {
        requireRule(ruleId);
        validateTierRanges(tiers);
        tierDao.deleteByRuleId(ruleId);
        for (PromotionRuleTierReq req : tiers) {
            PromotionRuleTier tier = new PromotionRuleTier();
            tier.setRuleId(ruleId);
            tier.setMinCount(req.getMinCount());
            tier.setMaxCount(req.getMaxCount());
            tier.setRewardAmount(req.getRewardAmount());
            tier.setStatus(req.getStatus());
            tier.setRemark(req.getRemark());
            if (StrUtil.isBlank(tier.getStatus())) {
                tier.setStatus(CommonStatusEnum.ENABLED.getCode());
            }
            tierDao.insert(tier);
        }
        audit("rule_tier", ruleId, "save", null, String.valueOf(tiers.size()));
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

    private void validateRule(PromotionRuleSaveReq req) {
        if (req.getRewardAmount() != null && req.getRewardAmount().signum() < 0) {
            throw new BusinessException("奖励金额不能为负数");
        }
        if (req.getDailyLimit() != null && req.getDailyLimit().signum() < 0) {
            throw new BusinessException("单日上限不能为负数");
        }
        if (req.getEffectiveTime() != null && req.getExpireTime() != null && req.getEffectiveTime().isAfter(req.getExpireTime())) {
            throw new BusinessException("生效时间不能晚于失效时间");
        }
    }

    private void validateTierRanges(List<PromotionRuleTierReq> tiers) {
        List<PromotionRuleTierReq> sorted = tiers.stream()
                .sorted(java.util.Comparator.comparing(PromotionRuleTierReq::getMinCount))
                .toList();
        int lastMax = -1;
        for (PromotionRuleTierReq tier : sorted) {
            if (tier.getMinCount() == null || tier.getMaxCount() == null || tier.getMinCount() > tier.getMaxCount()) {
                throw new BusinessException("阶梯区间不合法");
            }
            if (tier.getRewardAmount() == null || tier.getRewardAmount().signum() < 0) {
                throw new BusinessException("阶梯奖励金额不能为空且不能为负数");
            }
            if (tier.getMinCount() <= lastMax) {
                throw new BusinessException("阶梯区间不能重叠");
            }
            lastMax = tier.getMaxCount();
        }
    }

    private PromotionRule toEntity(PromotionRuleSaveReq req) {
        PromotionRule rule = new PromotionRule();
        rule.setRuleName(req.getRuleName());
        rule.setRuleType(req.getRuleType());
        rule.setEventType(req.getEventType());
        rule.setRewardAmount(req.getRewardAmount());
        rule.setRewardUnit(req.getRewardUnit());
        rule.setDailyLimit(req.getDailyLimit());
        rule.setEffectiveTime(req.getEffectiveTime());
        rule.setExpireTime(req.getExpireTime());
        rule.setAgentGroup(req.getAgentGroup());
        rule.setStatus(req.getStatus());
        rule.setRemark(req.getRemark());
        return rule;
    }

    private PromotionRuleVO toVO(PromotionRule entity) {
        PromotionRuleVO vo = new PromotionRuleVO();
        vo.setId(entity.getId());
        vo.setRuleName(entity.getRuleName());
        vo.setRuleType(entity.getRuleType());
        vo.setEventType(entity.getEventType());
        vo.setRewardAmount(entity.getRewardAmount());
        vo.setRewardUnit(entity.getRewardUnit());
        vo.setDailyLimit(entity.getDailyLimit());
        vo.setEffectiveTime(entity.getEffectiveTime());
        vo.setExpireTime(entity.getExpireTime());
        vo.setAgentGroup(entity.getAgentGroup());
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }
}

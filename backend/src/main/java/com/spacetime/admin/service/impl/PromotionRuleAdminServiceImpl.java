package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionAgentBonusRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionInviteRewardRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionRulePageReq;
import com.spacetime.admin.dto.request.PromotionRuleSaveReq;
import com.spacetime.admin.dto.request.PromotionRuleTierReq;
import com.spacetime.admin.dto.request.PromotionRiskConfigSaveReq;
import com.spacetime.admin.dto.response.PromotionRuleConfigVO;
import com.spacetime.admin.dto.response.PromotionRuleVO;
import com.spacetime.admin.service.PromotionRuleAdminService;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.PromotionRuleDao;
import com.spacetime.common.dao.PromotionRuleTierDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.entity.PromotionRule;
import com.spacetime.common.entity.PromotionRuleTier;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.PromotionRuleTypeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final UserDao userDao;

    @Override
    public Page<PromotionRuleVO> list(PromotionRulePageReq req) {
        LambdaQueryWrapper<PromotionRule> wrapper = new LambdaQueryWrapper<PromotionRule>()
                .eq(StrUtil.isNotBlank(req.getRuleType()), PromotionRule::getRuleType, req.getRuleType())
                .eq(StrUtil.isNotBlank(req.getEventType()), PromotionRule::getEventType, req.getEventType())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionRule::getStatus, req.getStatus())
                .orderByDesc(PromotionRule::getUpdateTime)
                .orderByDesc(PromotionRule::getCreateTime);
        Page<PromotionRule> page = ruleDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionRuleVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public PromotionRuleConfigVO config() {
        Page<PromotionRule> page = ruleDao.selectPage(new Page<>(1, 500, false),
                new LambdaQueryWrapper<PromotionRule>().orderByDesc(PromotionRule::getCreateTime));
        List<PromotionRuleVO> rules = page.getRecords().stream().map(this::toVO).toList();
        PromotionRuleConfigVO vo = new PromotionRuleConfigVO();
        vo.setInviteRewardRules(rules.stream()
                .filter(rule -> PromotionRuleTypeEnum.USER_INVITE.getCode().equals(rule.getRuleType()))
                .toList());
        vo.setAgentBonusRules(rules.stream()
                .filter(rule -> PromotionRuleTypeEnum.AGENT_BONUS.getCode().equals(rule.getRuleType()))
                .toList());
        vo.setRiskRules(rules.stream()
                .filter(rule -> "risk_control".equals(rule.getRuleType()))
                .toList());
        vo.setRelationValidityText("永久有效");
        return vo;
    }

    @Override
    @Transactional
    public void saveInviteReward(PromotionInviteRewardRuleSaveReq req) {
        validateInviteRewardConfig(req);
        if (req.getEvents() != null) {
            for (PromotionInviteRewardRuleSaveReq.EventRule event : req.getEvents()) {
                saveRule(PromotionRuleTypeEnum.USER_INVITE.getCode(),
                        event.getEventType(),
                        "普通邀请-" + event.getEventType(),
                        event.getAmount(),
                        "coin",
                        req.getRewardCap(),
                        Boolean.TRUE.equals(event.getEnabled()),
                        req.getEffectiveTime(),
                        req.getExpireTime());
            }
        }
        audit("rule_config", null, "save_invite_reward", null, req.getRewardMode());
    }

    @Override
    @Transactional
    public void saveAgentBonus(PromotionAgentBonusRuleSaveReq req) {
        if (req.getRuleGroups() == null || req.getRuleGroups().isEmpty()) {
            throw new BusinessException("代理奖金规则组不能为空");
        }
        for (PromotionAgentBonusRuleSaveReq.RuleGroup group : req.getRuleGroups()) {
            if (StrUtil.isBlank(group.getGroupCode()) || StrUtil.isBlank(group.getGroupName())) {
                throw new BusinessException("代理奖金规则组编码和名称不能为空");
            }
            if (group.getEvents() == null || group.getEvents().isEmpty()) {
                throw new BusinessException("代理奖金事件不能为空");
            }
            for (PromotionAgentBonusRuleSaveReq.EventRule event : group.getEvents()) {
                validateEventAmount(event.getEventType(), event.getAmount(), Boolean.TRUE.equals(event.getEnabled()));
                saveRule(PromotionRuleTypeEnum.AGENT_BONUS.getCode(),
                        group.getGroupCode() + ":" + event.getEventType(),
                        group.getGroupName() + "-" + event.getEventType(),
                        event.getAmount(),
                        "cash",
                        null,
                        Boolean.TRUE.equals(group.getEnabled()) && Boolean.TRUE.equals(event.getEnabled()),
                        null,
                        null);
            }
        }
        audit("rule_config", null, "save_agent_bonus", null, String.valueOf(req.getRuleGroups().size()));
    }

    @Override
    @Transactional
    public void saveRiskConfig(PromotionRiskConfigSaveReq req) {
        if (req.getDailyCap() != null && req.getDailyCap() < 0
                || req.getDeviceThreshold() != null && req.getDeviceThreshold() < 0
                || req.getPhoneThreshold() != null && req.getPhoneThreshold() < 0
                || req.getPaymentThreshold() != null && req.getPaymentThreshold() < 0) {
            throw new BusinessException("风控阈值不能为负数");
        }
        saveRiskRule("daily_cap", "单日奖励上限", req.getDailyCap(), "count", true);
        saveRiskRule("device_threshold", "同设备阈值", req.getDeviceThreshold(), "count", true);
        saveRiskRule("phone_threshold", "同手机号阈值", req.getPhoneThreshold(), "count", true);
        saveRiskRule("payment_threshold", "同支付账号阈值", req.getPaymentThreshold(), "count", true);
        saveRiskRule("freeze_switch", "自动冻结开关", Boolean.TRUE.equals(req.getFreezeSwitch()) ? 1 : 0, "bool", true);
        saveRiskRule("review_switch", "人工复核开关", Boolean.TRUE.equals(req.getReviewSwitch()) ? 1 : 0, "bool", true);
        audit("rule_config", null, "save_risk", null, "risk");
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
        validateEnabledUnique(rule.getRuleType(), rule.getEventType(), null, rule.getStatus());
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
        entity.setStatus(changed.getStatus());
        entity.setRemark(changed.getRemark());
        validateEnabledUnique(entity.getRuleType(), entity.getEventType(), id, entity.getStatus());
        ruleDao.updateById(entity);
        audit("rule", id, "update", null, entity.getRuleName());
    }

    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        PromotionRule entity = requireRule(id);
        String before = entity.getStatus();
        validateEnabledUnique(entity.getRuleType(), entity.getEventType(), id, status);
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
        if (StrUtil.isNotBlank(req.getRuleType())
                && !PromotionRuleTypeEnum.USER_INVITE.getCode().equals(req.getRuleType())
                && !PromotionRuleTypeEnum.AGENT_BONUS.getCode().equals(req.getRuleType())
                && !"risk_control".equals(req.getRuleType())) {
            throw new BusinessException("规则类型不支持");
        }
    }

    private void validateInviteRewardConfig(PromotionInviteRewardRuleSaveReq req) {
        if (req.getEvents() == null || req.getEvents().isEmpty()) {
            throw new BusinessException("普通邀请奖励事件不能为空");
        }
        if (req.getRewardCap() != null && req.getRewardCap().signum() < 0) {
            throw new BusinessException("奖励上限不能为负数");
        }
        if (req.getEffectiveTime() != null && req.getExpireTime() != null && req.getEffectiveTime().isAfter(req.getExpireTime())) {
            throw new BusinessException("生效时间不能晚于失效时间");
        }
        for (PromotionInviteRewardRuleSaveReq.EventRule event : req.getEvents()) {
            validateEventAmount(event.getEventType(), event.getAmount(), Boolean.TRUE.equals(event.getEnabled()));
        }
        if ("ladder".equals(req.getRewardMode())) {
            validateLadderRules(req.getLadder());
        }
    }

    private void validateEventAmount(String eventType, java.math.BigDecimal amount, boolean enabled) {
        if (StrUtil.isBlank(eventType)) {
            throw new BusinessException("事件类型不能为空");
        }
        if (enabled && (amount == null || amount.signum() <= 0)) {
            throw new BusinessException("启用事件的奖励金额必须大于 0");
        }
        if (amount != null && amount.signum() < 0) {
            throw new BusinessException("奖励金额不能为负数");
        }
    }

    private void validateLadderRules(List<PromotionInviteRewardRuleSaveReq.LadderRule> ladder) {
        if (ladder == null || ladder.isEmpty()) {
            throw new BusinessException("阶梯奖励需配置阶梯档位");
        }
        List<PromotionInviteRewardRuleSaveReq.LadderRule> sorted = ladder.stream()
                .sorted(java.util.Comparator.comparing(PromotionInviteRewardRuleSaveReq.LadderRule::getMinCount))
                .toList();
        int lastMax = -1;
        for (PromotionInviteRewardRuleSaveReq.LadderRule tier : sorted) {
            if (tier.getMinCount() == null || tier.getMaxCount() == null || tier.getMinCount() > tier.getMaxCount()) {
                throw new BusinessException("阶梯区间不合法");
            }
            if (tier.getAmount() == null || tier.getAmount().signum() < 0) {
                throw new BusinessException("阶梯奖励金额不能为空且不能为负数");
            }
            if (tier.getMinCount() <= lastMax) {
                throw new BusinessException("阶梯区间不能重叠");
            }
            lastMax = tier.getMaxCount();
        }
    }

    private void saveRule(String ruleType,
                          String eventType,
                          String ruleName,
                          BigDecimal amount,
                          String unit,
                          BigDecimal dailyLimit,
                          boolean enabled,
                          java.time.LocalDateTime effectiveTime,
                          java.time.LocalDateTime expireTime) {
        PromotionRule rule = ruleDao.selectPage(new Page<>(1, 1),
                new LambdaQueryWrapper<PromotionRule>()
                        .eq(PromotionRule::getRuleType, ruleType)
                        .eq(PromotionRule::getEventType, eventType)).getRecords().stream().findFirst().orElse(null);
        if (rule == null) {
            rule = new PromotionRule();
            rule.setRuleType(ruleType);
            rule.setEventType(eventType);
        }
        rule.setRuleName(ruleName);
        rule.setRewardAmount(amount == null ? java.math.BigDecimal.ZERO : amount);
        rule.setRewardUnit(unit);
        rule.setDailyLimit(dailyLimit);
        rule.setEffectiveTime(effectiveTime);
        rule.setExpireTime(expireTime);
        rule.setStatus(enabled ? CommonStatusEnum.ENABLED.getCode() : CommonStatusEnum.DISABLED.getCode());
        validateEnabledUnique(rule.getRuleType(), rule.getEventType(), rule.getId(), rule.getStatus());
        if (rule.getId() == null) {
            ruleDao.insert(rule);
        } else {
            ruleDao.updateById(rule);
        }
    }

    private void validateEnabledUnique(String ruleType, String eventType, Long currentId, String status) {
        if (!CommonStatusEnum.ENABLED.getCode().equals(status)) {
            return;
        }
        if (StrUtil.isBlank(ruleType) || StrUtil.isBlank(eventType)) {
            return;
        }
        LambdaQueryWrapper<PromotionRule> wrapper = new LambdaQueryWrapper<PromotionRule>()
                .eq(PromotionRule::getRuleType, ruleType)
                .eq(PromotionRule::getEventType, eventType)
                .eq(PromotionRule::getStatus, CommonStatusEnum.ENABLED.getCode())
                .ne(currentId != null, PromotionRule::getId, currentId);
        boolean exists = !ruleDao.selectPage(new Page<>(1, 1), wrapper).getRecords().isEmpty();
        if (exists) {
            throw new BusinessException("同一数据类型、事件在启用状态下只能保留一条规则");
        }
    }

    private void saveRiskRule(String eventType, String ruleName, Integer threshold, String unit, boolean enabled) {
        saveRule("risk_control",
                eventType,
                ruleName,
                threshold == null ? BigDecimal.ZERO : BigDecimal.valueOf(threshold),
                unit,
                null,
                enabled,
                null,
                null);
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
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        vo.setCreatedBy(entity.getCreatedBy());
        vo.setCreatedByName(userDisplayName(entity.getCreatedBy()));
        vo.setUpdatedBy(entity.getUpdatedBy());
        vo.setUpdatedByName(userDisplayName(entity.getUpdatedBy()));
        return vo;
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
}

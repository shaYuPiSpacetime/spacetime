package com.spacetime.admin.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.PromotionAgentPageReq;
import com.spacetime.admin.dto.request.PromotionAgentSaveReq;
import com.spacetime.admin.dto.response.PromotionAgentQrCodeVO;
import com.spacetime.admin.dto.response.PromotionAgentStatVO;
import com.spacetime.admin.dto.response.PromotionAgentVO;
import com.spacetime.admin.service.PromotionAgentAdminService;
import com.spacetime.common.dao.PromotionAgentQrCodeDao;
import com.spacetime.common.dao.PromotionAgentBonusLogDao;
import com.spacetime.common.dao.PromotionAgentSettlementDao;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.dao.PromotionAuditLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.entity.PromotionAgentBonusLog;
import com.spacetime.common.entity.PromotionAgentQrCode;
import com.spacetime.common.entity.PromotionAgentEvent;
import com.spacetime.common.entity.PromotionAgentSettlement;
import com.spacetime.common.entity.PromotionAgentStat;
import com.spacetime.common.entity.PromotionAuditLog;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.PromotionAgentStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.PromotionAgentStatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 代理后台服务实现
 */
@Service
@RequiredArgsConstructor
public class PromotionAgentAdminServiceImpl implements PromotionAgentAdminService {
    private final PromotionAgentDao agentDao;
    private final PromotionAgentQrCodeDao qrCodeDao;
    private final PromotionAgentEventDao agentEventDao;
    private final PromotionAgentBonusLogDao bonusLogDao;
    private final PromotionAgentSettlementDao settlementDao;
    private final PromotionAuditLogDao auditLogDao;
    private final UserDao userDao;
    private final PromotionAgentStatService agentStatService;

    @Override
    public Page<PromotionAgentVO> list(PromotionAgentPageReq req) {
        LambdaQueryWrapper<PromotionAgent> wrapper = new LambdaQueryWrapper<PromotionAgent>()
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w
                        .like(PromotionAgent::getAgentNo, req.getKeyword())
                        .or()
                        .like(PromotionAgent::getAgentName, req.getKeyword())
                        .or()
                        .like(PromotionAgent::getSchool, req.getKeyword())
                        .or()
                        .like(PromotionAgent::getContactName, req.getKeyword())
                        .or()
                        .like(PromotionAgent::getContactPhone, req.getKeyword()))
                .like(StrUtil.isNotBlank(req.getAgentNo()), PromotionAgent::getAgentNo, req.getAgentNo())
                .eq(StrUtil.isNotBlank(req.getSchool()), PromotionAgent::getSchool, req.getSchool())
                .eq(StrUtil.isNotBlank(req.getStatus()), PromotionAgent::getStatus, req.getStatus())
                .orderByDesc(PromotionAgent::getCreateTime);
        Page<PromotionAgent> page = agentDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<PromotionAgentVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public PromotionAgentVO detail(Long id) {
        return toVO(requireAgent(id));
    }

    private PromotionAgent requireAgent(Long id) {
        PromotionAgent agent = agentDao.selectById(id);
        if (agent == null) {
            throw new BusinessException("代理不存在");
        }
        return agent;
    }

    @Override
    @Transactional
    public Long create(PromotionAgentSaveReq req) {
        PromotionAgent agent = toEntity(req);
        if (StrUtil.isBlank(agent.getAgentNo())) {
            agent.setAgentNo(nextAgentNo());
        }
        if (StrUtil.isBlank(agent.getStatus())) {
            agent.setStatus(PromotionAgentStatusEnum.NORMAL.getCode());
        }
        agentDao.insert(agent);
        agentStatService.initAgentStat(agent);
        audit("agent", agent.getId(), "create", null, agent.getAgentName());
        return agent.getId();
    }

    @Override
    @Transactional
    public void update(Long id, PromotionAgentSaveReq req) {
        PromotionAgent entity = requireAgent(id);
        PromotionAgent agent = toEntity(req);
        entity.setAgentName(agent.getAgentName());
        entity.setContactName(agent.getContactName());
        entity.setContactPhone(agent.getContactPhone());
        entity.setSchool(agent.getSchool());
        entity.setCampus(agent.getCampus());
        entity.setAgentGroup(agent.getAgentGroup());
        entity.setBonusRuleGroup(agent.getBonusRuleGroup());
        entity.setStatus(agent.getStatus());
        entity.setRemark(agent.getRemark());
        agentDao.updateById(entity);
        audit("agent", id, "update", null, entity.getAgentName());
    }

    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        PromotionAgent entity = requireAgent(id);
        String before = entity.getStatus();
        entity.setStatus(status);
        agentDao.updateById(entity);
        audit("agent", id, "status", before, status);
    }

    @Override
    @Transactional
    public PromotionAgentQrCodeVO regenerateCode(Long agentId) {
        requireAgent(agentId);
        PromotionAgentQrCode code = new PromotionAgentQrCode();
        code.setAgentId(agentId);
        code.setQrCode("A" + IdUtil.fastSimpleUUID().substring(0, 15));
        code.setMiniappPath("/pages/index/index?qrCode=" + code.getQrCode());
        code.setVersionNo(nextQrVersion(agentId));
        code.setStatus("enabled");
        qrCodeDao.insert(code);
        audit("qr_code", code.getId(), "create", null, code.getQrCode());
        return toCodeVO(code);
    }

    @Override
    @Transactional
    public PromotionAgentQrCodeVO regenerateMaterialCode(Long codeId) {
        PromotionAgentQrCode oldCode = qrCodeDao.selectById(codeId);
        if (oldCode == null) {
            throw new BusinessException("校园代理二维码不存在");
        }
        if (!"disabled".equals(oldCode.getStatus())) {
            oldCode.setStatus("disabled");
            qrCodeDao.updateById(oldCode);
            audit("qr_code", codeId, "disable_for_regenerate", "enabled", "disabled");
        }
        return regenerateCode(oldCode.getAgentId());
    }

    @Override
    public Page<PromotionAgentQrCodeVO> materials(Long agentId, String agentKeyword, String qrCode, int page, int size, String status) {
        java.util.List<Long> agentIds = findAgentIds(agentKeyword);
        if (StrUtil.isNotBlank(agentKeyword) && agentIds.isEmpty()) {
            return new Page<>(page, Math.min(size, 100), 0);
        }
        LambdaQueryWrapper<PromotionAgentQrCode> wrapper = new LambdaQueryWrapper<PromotionAgentQrCode>()
                .eq(agentId != null, PromotionAgentQrCode::getAgentId, agentId)
                .in(!agentIds.isEmpty(), PromotionAgentQrCode::getAgentId, agentIds)
                .like(StrUtil.isNotBlank(qrCode), PromotionAgentQrCode::getQrCode, qrCode)
                .eq(StrUtil.isNotBlank(status), PromotionAgentQrCode::getStatus, status)
                .orderByDesc(PromotionAgentQrCode::getCreateTime);
        Page<PromotionAgentQrCode> result = qrCodeDao.selectPage(new Page<>(page, Math.min(size, 100)), wrapper);
        Page<PromotionAgentQrCodeVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toCodeVO).toList());
        return voPage;
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
                .like(PromotionAgent::getSchool, keyword);
        return agentDao.selectPage(new Page<>(1, 100), wrapper).getRecords().stream()
                .map(PromotionAgent::getId)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Override
    @Transactional
    public void disableCode(Long codeId) {
        PromotionAgentQrCode code = qrCodeDao.selectById(codeId);
        if (code == null) {
            throw new BusinessException("校园代理二维码不存在");
        }
        code.setStatus("disabled");
        qrCodeDao.updateById(code);
        audit("qr_code", codeId, "disable", "enabled", "disabled");
    }

    @Override
    public Page<PromotionAgentEvent> events(Long agentId, int page, int size, String eventType) {
        LambdaQueryWrapper<PromotionAgentEvent> wrapper = new LambdaQueryWrapper<PromotionAgentEvent>()
                .eq(PromotionAgentEvent::getAgentId, agentId)
                .eq(StrUtil.isNotBlank(eventType), PromotionAgentEvent::getEventType, eventType)
                .orderByDesc(PromotionAgentEvent::getEventTime);
        return agentEventDao.selectPage(new Page<>(page, Math.min(size, 100)), wrapper);
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

    private PromotionAgent toEntity(PromotionAgentSaveReq req) {
        PromotionAgent agent = new PromotionAgent();
        agent.setAgentName(req.getAgentName());
        agent.setContactName(req.getContactName());
        agent.setContactPhone(req.getContactPhone());
        agent.setSchool(req.getSchool());
        agent.setCampus(req.getCampus());
        agent.setAgentGroup(req.getBonusRuleGroup());
        agent.setBonusRuleGroup(req.getBonusRuleGroup());
        agent.setStatus(req.getStatus());
        agent.setRemark(req.getRemark());
        return agent;
    }

    private PromotionAgentVO toVO(PromotionAgent entity) {
        PromotionAgentVO vo = new PromotionAgentVO();
        vo.setId(entity.getId());
        vo.setAgentNo(entity.getAgentNo());
        vo.setAgentName(entity.getAgentName());
        vo.setContactName(entity.getContactName());
        vo.setContactPhone(entity.getContactPhone());
        vo.setSchool(entity.getSchool());
        vo.setCampus(entity.getCampus());
        vo.setBonusRuleGroup(StrUtil.blankToDefault(entity.getBonusRuleGroup(), entity.getAgentGroup()));
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        PromotionAgentStatVO stat = toStatVO(agentStatService.getOrEmpty(entity.getId()));
        vo.setStat(stat);
        vo.setBonusDueAmount(stat.getBonusDueAmount());
        vo.setBonusPaidAmount(stat.getBonusPaidAmount());
        vo.setBonusPendingAmount(stat.getBonusPendingAmount());
        vo.setQrCodes(qrCodes(entity.getId()));
        vo.setPromotionEvents(agentEvents(entity.getId()));
        vo.setBonusRecords(bonusRecords(entity.getId()));
        vo.setSettlementRecords(settlementRecords(entity));
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    private PromotionAgentStatVO toStatVO(PromotionAgentStat stat) {
        PromotionAgentStatVO vo = new PromotionAgentStatVO();
        vo.setClickCnt(stat.getClickCnt());
        vo.setRegisterCnt(stat.getRegisterCnt());
        vo.setProfileCnt(stat.getProfileCnt());
        vo.setVerifyCnt(stat.getVerifyCnt());
        vo.setSuccessCnt(stat.getSuccessCnt());
        vo.setFirstVipCnt(stat.getFirstVipCnt());
        vo.setFirstCoinRechargeCnt(stat.getFirstCoinRechargeCnt());
        vo.setBonusDueAmount(stat.getBonusDueAmount());
        vo.setBonusPendingAmount(stat.getBonusPendingAmount());
        vo.setBonusConfirmedAmount(stat.getBonusConfirmedAmount());
        vo.setBonusPaidAmount(stat.getBonusPaidAmount());
        vo.setLastEventTime(stat.getLastEventTime());
        vo.setLastSettlementTime(stat.getLastSettlementTime());
        vo.setStatVersion(stat.getStatVersion());
        return vo;
    }

    private String nextAgentNo() {
        return "AGT-" + java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE)
                + "-" + IdUtil.fastSimpleUUID().substring(0, 6).toUpperCase();
    }

    private int nextQrVersion(Long agentId) {
        Page<PromotionAgentQrCode> page = qrCodeDao.selectPage(new Page<>(1, 1, false),
                new LambdaQueryWrapper<PromotionAgentQrCode>()
                        .eq(PromotionAgentQrCode::getAgentId, agentId)
                        .orderByDesc(PromotionAgentQrCode::getVersionNo));
        return page.getRecords().stream()
                .findFirst()
                .map(PromotionAgentQrCode::getVersionNo)
                .map(version -> version + 1)
                .orElse(1);
    }

    private PromotionAgentQrCodeVO toCodeVO(PromotionAgentQrCode entity) {
        PromotionAgentQrCodeVO vo = new PromotionAgentQrCodeVO();
        vo.setId(entity.getId());
        vo.setAgentId(entity.getAgentId());
        PromotionAgent agent = entity.getAgentId() == null ? null : agentDao.selectById(entity.getAgentId());
        vo.setAgentNo(agent == null ? null : agent.getAgentNo());
        vo.setAgentName(agent == null ? null : agent.getAgentName());
        vo.setQrCode(entity.getQrCode());
        vo.setMiniappPath(entity.getMiniappPath());
        vo.setQrUrl(entity.getQrUrl());
        vo.setMaterialUrl(entity.getMaterialUrl());
        vo.setMaterialTemplate(StrUtil.blankToDefault(entity.getMaterialUrl(), "默认海报模板"));
        vo.setValidityText("长期有效");
        vo.setVersionNo(entity.getVersionNo());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    private java.util.List<PromotionAgentQrCodeVO> qrCodes(Long agentId) {
        Page<PromotionAgentQrCode> page = qrCodeDao.selectPage(new Page<>(1, 50, false),
                new LambdaQueryWrapper<PromotionAgentQrCode>()
                        .eq(PromotionAgentQrCode::getAgentId, agentId)
                        .orderByDesc(PromotionAgentQrCode::getCreateTime));
        return page.getRecords().stream().map(this::toCodeVO).toList();
    }

    private java.util.List<PromotionAgentVO.AgentEventRecordVO> agentEvents(Long agentId) {
        Page<PromotionAgentEvent> page = agentEventDao.selectPage(new Page<>(1, 100, false),
                new LambdaQueryWrapper<PromotionAgentEvent>()
                        .eq(PromotionAgentEvent::getAgentId, agentId)
                        .orderByDesc(PromotionAgentEvent::getEventTime));
        return page.getRecords().stream().map(event -> {
            PromotionAgentVO.AgentEventRecordVO vo = new PromotionAgentVO.AgentEventRecordVO();
            SysUser user = user(event.getUserId());
            vo.setId(event.getId());
            vo.setQrCode(event.getQrCode());
            vo.setRelationId(event.getRelationId());
            vo.setUserId(event.getUserId());
            vo.setUserUuid(userUuid(user, event.getUserId()));
            vo.setUserName(userDisplayName(user));
            vo.setUserPhone(user == null ? null : user.getPhone());
            vo.setEventType(event.getEventType());
            vo.setEventTime(event.getEventTime());
            vo.setBonusGenerated(event.getBonusGenerated());
            return vo;
        }).toList();
    }

    private java.util.List<PromotionAgentVO.AgentBonusRecordVO> bonusRecords(Long agentId) {
        Page<PromotionAgentBonusLog> page = bonusLogDao.selectPage(new Page<>(1, 100, false),
                new LambdaQueryWrapper<PromotionAgentBonusLog>()
                        .eq(PromotionAgentBonusLog::getAgentId, agentId)
                        .orderByDesc(PromotionAgentBonusLog::getCreateTime));
        return page.getRecords().stream().map(log -> {
            PromotionAgentVO.AgentBonusRecordVO vo = new PromotionAgentVO.AgentBonusRecordVO();
            SysUser user = user(log.getUserId());
            vo.setId(log.getId());
            vo.setBonusNo(log.getBonusNo());
            vo.setRelationId(log.getRelationId());
            vo.setUserId(log.getUserId());
            vo.setUserUuid(userUuid(user, log.getUserId()));
            vo.setUserName(userDisplayName(user));
            vo.setEventType(log.getEventType());
            vo.setBonusAmount(log.getBonusAmount());
            vo.setStatus(log.getStatus());
            vo.setSettlementId(log.getSettlementId());
            vo.setCreateTime(log.getCreateTime());
            return vo;
        }).toList();
    }

    private java.util.List<com.spacetime.admin.dto.response.PromotionSettlementVO> settlementRecords(PromotionAgent agent) {
        Page<PromotionAgentSettlement> page = settlementDao.selectPage(new Page<>(1, 100, false),
                new LambdaQueryWrapper<PromotionAgentSettlement>()
                        .eq(PromotionAgentSettlement::getAgentId, agent.getId())
                        .orderByDesc(PromotionAgentSettlement::getCreateTime));
        return page.getRecords().stream().map(settlement -> {
            com.spacetime.admin.dto.response.PromotionSettlementVO vo = new com.spacetime.admin.dto.response.PromotionSettlementVO();
            vo.setId(settlement.getId());
            vo.setSettlementNo(settlement.getSettlementNo());
            vo.setAgentId(agent.getId());
            vo.setAgentNo(agent.getAgentNo());
            vo.setAgentName(agent.getAgentName());
            vo.setAgentDisplay(agent.getAgentNo() + " / " + agent.getAgentName());
            vo.setPeriodStart(settlement.getPeriodStart());
            vo.setPeriodEnd(settlement.getPeriodEnd());
            vo.setPeriodText(settlement.getPeriodStart() + " 至 " + settlement.getPeriodEnd());
            vo.setStatsDesc(settlement.getStatsDesc());
            vo.setCaliberDesc(StrUtil.blankToDefault(settlement.getStatsDesc(), "按正式版推广成功口径统计"));
            vo.setPayableAmount(settlement.getPayableAmount());
            vo.setPaidAmount(settlement.getPaidAmount());
            vo.setStatus(settlement.getStatus());
            vo.setSettlementMethod("线下发放");
            vo.setPayeeInfo("以代理合同/备注为准");
            vo.setConfirmTime(settlement.getConfirmTime());
            vo.setPaidTime(settlement.getPaidTime());
            vo.setRemark(settlement.getRemark());
            vo.setCreateTime(settlement.getCreateTime());
            return vo;
        }).toList();
    }

    private SysUser user(Long userId) {
        return userId == null ? null : userDao.selectById(userId);
    }

    private String userUuid(SysUser user, Long userId) {
        if (user == null) {
            return userId == null ? null : String.valueOf(userId);
        }
        return StrUtil.blankToDefault(user.getUsername(), String.valueOf(user.getId()));
    }

    private String userDisplayName(SysUser user) {
        if (user == null) {
            return null;
        }
        return StrUtil.blankToDefault(user.getNickname(), user.getUsername());
    }
}
